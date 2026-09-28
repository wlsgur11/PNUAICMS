/**
 * GET  /api/companies   — 목록 (필터: q, region, priority, status, includeInactive)
 * POST /api/companies   — 신규 등록 (+협업정보 1:1 생성, +선택적 자동조회)
 */
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/http';
import { nextCode } from '@/lib/codes';
import { companyCreateSchema } from '@/lib/validation';
import { lookupCompany } from '@/lib/lookup';
import { autoLinkRecords, findAliasConflict } from '@/lib/company-autolink';
import { kstDate } from '@/lib/kst';
import { companyWhere } from '@/lib/list-filters';

export async function GET(req: Request) {
  return handle(async () => {
    await requireRole('ADMIN');
    const sp = new URL(req.url).searchParams;
    const where = companyWhere(sp);

    // 정렬: sort 파라미터로 동적 정렬. 이름순/연도/우선순위/상태/수정일 등.
    const sort = sp.get('sort') || 'name_asc';
    const orderBy = (() => {
      const nameAsc = { name: 'asc' as const };
      switch (sort) {
        case 'name_desc': return [{ name: 'desc' as const }];
        case 'year_desc': return [{ joinYear: { sort: 'desc' as const, nulls: 'last' as const } }, nameAsc];
        case 'year_asc': return [{ joinYear: { sort: 'asc' as const, nulls: 'last' as const } }, nameAsc];
        case 'priority_asc': return [{ priority: { sort: 'asc' as const, nulls: 'last' as const } }, nameAsc];
        case 'status_asc': return [{ status: 'asc' as const }, nameAsc];
        case 'updated_desc': return [{ updatedAt: 'desc' as const }];
        case 'meeting_desc': case 'meeting_asc': return [nameAsc]; // 최근미팅일은 컬럼이 아니라 fetch 후 정렬
        default: return [nameAsc]; // name_asc
      }
    })();

    const companies = await prisma.company.findMany({
      where,
      orderBy,
      include: {
        collaboration: { select: { internship: true, employment: true } },
        histories: { orderBy: { contactDate: 'desc' }, take: 1, select: { contactDate: true } },
      },
    });

    // 목록 화면용으로 평탄화 (기업명/담당교수/MOU/인턴십/채용연계/최근미팅일/우선순위)
    const rows = companies.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      professor: c.professor1 || '',
      region: c.region || '',
      mou: c.mou,
      internship: c.collaboration?.internship ?? false,
      employment: c.collaboration?.employment ?? false,
      lastMeeting: c.histories[0]?.contactDate || '',
      priority: c.priority || '',
      status: c.status,
      isActive: c.isActive,
    }));

    // 컬럼이 아닌 파생값(최근미팅일)은 후처리 정렬
    if (sort === 'meeting_desc') rows.sort((a, b) => (b.lastMeeting || '').localeCompare(a.lastMeeting || ''));
    // 오래 연락 안 한 곳부터. 기록이 없는 곳은 다른 정렬처럼 맨 뒤로 보낸다
    if (sort === 'meeting_asc') rows.sort((a, b) => (a.lastMeeting || '9999').localeCompare(b.lastMeeting || '9999'));
    return ok(rows);
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireRole('ADMIN');
    const body = await req.json();
    const parsed = companyCreateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? '입력값 오류', 422);
    const input = parsed.data;

    // 중복 체크 (기관명 unique)
    const dup = await prisma.company.findUnique({ where: { name: input.name } });
    if (dup && dup.isActive) {
      return fail(`이미 등록된 기관명입니다: ${input.name}`, 409);
    }

    if (input.aliases?.length) {
      const clash = await findAliasConflict(dup?.id ?? null, input.aliases);
      if (clash) return fail(`별칭 '${clash.alias}' 은(는) 이미 '${clash.owner}' 이(가) 쓰고 있습니다.`, 409);
    }

    // 자동조회 (이름 입력→자동 채움). 실패해도 등록은 진행.
    let auto = null as Awaited<ReturnType<typeof lookupCompany>> | null;
    if (input.autoLookup) {
      try {
        auto = await lookupCompany(input.name);
      } catch {
        auto = null;
      }
    }

    // 비활성 동명 기업이 있으면 → 새로 만들지 않고 "재활성화"한다.
    // 입력의 비어있지 않은 값과 자동조회 결과를 빈 칸 위주로 반영.
    if (dup && !dup.isActive) {
      const patch: Record<string, unknown> = { isActive: true };
      const overlay: Record<string, unknown> = {
        joinYear: input.joinYear,
        region: input.region ?? auto?.region,
        addressDetail: input.addressDetail ?? auto?.addressDetail,
        orgType: input.orgType,
        revenueScale: input.revenueScale ?? auto?.revenueScale,
        avgSalary: input.avgSalary ?? auto?.avgSalary,
        newcomerSalary: input.newcomerSalary ?? auto?.newcomerSalary,
        homepage: input.homepage ?? auto?.homepage,
        mainIndustry: input.mainIndustry ?? auto?.industry,
        aiField: input.aiField,
        professor1: input.professor1,
        professor2: input.professor2,
        mou: input.mou,
        priority: input.priority,
        status: input.status,
        summary: input.summary, // 특이사항: 수동 입력만 (자동조회 대상 아님)
        aliases: input.aliases?.length ? input.aliases : null, // 빈 배열로 기존 별칭을 지우지 않는다
      };
      for (const [k, v] of Object.entries(overlay)) {
        if (v == null) continue;
        if (typeof v === 'string' && !v.trim()) continue;
        patch[k] = v;
      }
      const reactivated = await prisma.company.update({
        where: { id: dup.id },
        data: { ...patch, updatedBy: user.email, version: { increment: 1 } },
      });
      await autoLinkRecords(reactivated.id, reactivated.name, reactivated.aliases);
      return ok({ id: reactivated.id, code: reactivated.code, reactivated: true, auto }, { status: 200 });
    }

    const company = await prisma.$transaction(async (tx) => {
      const code = await nextCode(tx, 'company');
      const note =
        auto && auto.sources.length > 0
          ? `[자동조회 ${kstDate()}] 대표:${auto.ceo || '?'} / 설립:${auto.foundedAt || '?'} / 출처:${auto.sources.join(',')}`
          : input.note || null;

      return tx.company.create({
        data: {
          code,
          name: input.name,
          aliases: input.aliases ?? [],
          joinYear: input.joinYear ?? null,
          region: input.region ?? auto?.region ?? null,
          addressDetail: input.addressDetail ?? auto?.addressDetail ?? null,
          orgType: input.orgType ?? null,
          employeeCount: input.employeeCount ?? null,
          revenueScale: input.revenueScale ?? auto?.revenueScale ?? null,
          avgSalary: input.avgSalary ?? auto?.avgSalary ?? null,
          newcomerSalary: input.newcomerSalary ?? auto?.newcomerSalary ?? null,
          homepage: input.homepage ?? auto?.homepage ?? null,
          mainIndustry: input.mainIndustry ?? auto?.industry ?? null,
          aiField: input.aiField ?? null,
          professor1: input.professor1 ?? null,
          professor2: input.professor2 ?? null,
          mou: input.mou ?? false,
          priority: input.priority ?? null,
          status: input.status ?? '미접촉',
          summary: input.summary ?? null, // 특이사항: 수동 입력만 (자동조회 대상 아님)
          note,
          createdBy: user.email,
          collaboration: { create: {} }, // 1:1 빈 협업정보 생성
        },
      });
    });

    await autoLinkRecords(company.id, company.name, company.aliases);
    return ok({ id: company.id, code: company.code, auto }, { status: 201 });
  });
}
