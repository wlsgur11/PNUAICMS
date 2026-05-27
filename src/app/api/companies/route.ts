/**
 * GET  /api/companies   — 목록 (필터: q, region, priority, status, includeInactive)
 * POST /api/companies   — 신규 등록 (+협업정보 1:1 생성, +선택적 자동조회)
 */
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/http';
import { nextCode } from '@/lib/codes';
import { companyCreateSchema } from '@/lib/validation';
import { lookupCompany } from '@/lib/lookup';

export async function GET(req: Request) {
  return handle(async () => {
    await requireUser();
    const sp = new URL(req.url).searchParams;
    const q = sp.get('q')?.trim();
    const region = sp.get('region')?.trim();
    const priority = sp.get('priority')?.trim();
    const status = sp.get('status')?.trim();
    const includeInactive = sp.get('includeInactive') === '1';

    const where: Record<string, unknown> = {};
    if (!includeInactive) where.isActive = true;
    if (q) where.name = { contains: q, mode: 'insensitive' };
    if (region) where.region = region;
    if (priority) where.priority = priority;
    if (status) where.status = status;

    const companies = await prisma.company.findMany({
      where,
      orderBy: { name: 'asc' },
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
    return ok(rows);
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireUser();
    const body = await req.json();
    const parsed = companyCreateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? '입력값 오류', 422);
    const input = parsed.data;

    // 중복 체크 (기관명 unique)
    const dup = await prisma.company.findUnique({ where: { name: input.name } });
    if (dup) return fail(`이미 등록된 기관명입니다: ${input.name}`, 409);

    // 자동조회 (이름 입력→자동 채움). 실패해도 등록은 진행.
    let auto = null as Awaited<ReturnType<typeof lookupCompany>> | null;
    if (input.autoLookup) {
      try {
        auto = await lookupCompany(input.name);
      } catch {
        auto = null;
      }
    }

    const company = await prisma.$transaction(async (tx) => {
      const code = await nextCode(tx, 'company');
      const note =
        auto && auto.sources.length > 0
          ? `[자동조회 ${new Date().toISOString().slice(0, 10)}] 대표:${auto.ceo || '?'} / 설립:${auto.foundedAt || '?'} / 출처:${auto.sources.join(',')}`
          : input.note || null;

      return tx.company.create({
        data: {
          code,
          name: input.name,
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
          summary: input.summary ?? auto?.summary ?? null,
          note,
          collaboration: { create: {} }, // 1:1 빈 협업정보 생성
        },
      });
    });

    return ok({ id: company.id, code: company.code, auto }, { status: 201 });
  });
}
