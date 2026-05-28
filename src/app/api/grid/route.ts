/**
 * GET  /api/grid — 엑셀형 넓은 행 목록 (기업 + 협업 + 담당자 + 대표자 를 한 행으로 평탄화)
 * POST /api/grid — 엑셀형 일괄 저장 (한 행 → 기업/협업/실무자 로 자동 분리 저장)
 *
 * "기존 엑셀 양식 그대로" 입력 화면의 백엔드.
 *  - 원본 26년 업체정보 엑셀의 한 행 = 기업 + 협력여부 + 담당자 + 대표자 였다.
 *  - 보기엔 한 줄짜리 시트지만, 저장은 정규화 테이블로 분리 + 행 단위 트랜잭션이라
 *    v1 시트의 동시추가 충돌/무결성 문제가 없다.
 */
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, handle } from '@/lib/http';
import { nextCode } from '@/lib/codes';
import { z } from 'zod';

// 한 행(원본 엑셀 컬럼 순서)
const rowSchema = z.object({
  id: z.string().optional().nullable(),
  version: z.coerce.number().int().optional().nullable(),
  // 구분
  domestic: z.string().optional().nullable(), // 국내외
  country: z.string().optional().nullable(), // 국가
  orgType: z.string().optional().nullable(), // 유형
  // 기업정보
  name: z.string().trim().min(1),
  joinYear: z.coerce.number().int().optional().nullable(),
  addressDetail: z.string().optional().nullable(), // 소재지
  // 협력사항 (O/체크)
  internship: z.boolean().optional(),
  overseasEducation: z.boolean().optional(),
  industryProject: z.boolean().optional(),
  curriculumCommittee: z.boolean().optional(),
  guestLecture: z.boolean().optional(),
  valueSpread: z.boolean().optional(),
  employment: z.boolean().optional(),
  fieldTrainingOrg: z.boolean().optional(),
  startup: z.boolean().optional(), // 창업 (체크)
  etc: z.boolean().optional(), // 기타 (체크)
  // 담당자
  contactName: z.string().optional().nullable(),
  contactPosition: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  contactEmail: z.string().optional().nullable(),
  // 대표자
  ceoName: z.string().optional().nullable(),
  ceoPhone: z.string().optional().nullable(),
  ceoEmail: z.string().optional().nullable(),
});

const COLLAB_BOOLS = [
  'internship', 'overseasEducation', 'industryProject', 'curriculumCommittee',
  'guestLecture', 'valueSpread', 'employment', 'fieldTrainingOrg',
  'startup', 'etc',
] as const;

export async function GET() {
  return handle(async () => {
    await requireUser();
    const companies = await prisma.company.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: { collaboration: true, persons: { where: { isActive: true }, orderBy: { createdAt: 'asc' } } },
    });

    const rows = companies.map((c) => {
      const ceo = c.persons.find((p) => p.position === '대표');
      const contact = c.persons.find((p) => p.position !== '대표') ?? null;
      const co = c.collaboration;
      return {
        id: c.id,
        version: c.version,
        code: c.code,
        orgType: c.orgType ?? '',
        name: c.name,
        joinYear: c.joinYear ?? null,
        addressDetail: c.addressDetail ?? '',
        internship: co?.internship ?? false,
        overseasEducation: co?.overseasEducation ?? false,
        industryProject: co?.industryProject ?? false,
        curriculumCommittee: co?.curriculumCommittee ?? false,
        guestLecture: co?.guestLecture ?? false,
        valueSpread: co?.valueSpread ?? false,
        employment: co?.employment ?? false,
        fieldTrainingOrg: co?.fieldTrainingOrg ?? false,
        // 아래 두 필드는 새로 추가된 컬럼. db push 후 prisma client 가 재생성되면 깔끔히 매핑됨.
        startup: (co as { startup?: boolean } | null)?.startup ?? false,
        etc: (co as { etc?: boolean } | null)?.etc ?? false,
        contactName: contact?.name ?? '',
        contactPosition: contact?.position ?? '',
        contactPhone: contact?.phone ?? '',
        contactEmail: contact?.email ?? '',
        ceoName: ceo?.name ?? '',
        ceoPhone: ceo?.phone ?? '',
        ceoEmail: ceo?.email ?? '',
        domestic: '',
        country: '',
      };
    });
    return ok(rows);
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireUser();
    const body = await req.json();
    const rawRows: unknown[] = Array.isArray(body?.rows) ? body.rows : [];
    const results: { ok: boolean; id?: string; name: string; error?: string }[] = [];

    for (const raw of rawRows) {
      const parsed = rowSchema.safeParse(raw);
      if (!parsed.success) {
        results.push({ ok: false, name: (raw as { name?: string })?.name ?? '(이름없음)', error: '입력값 오류' });
        continue;
      }
      const r = parsed.data;

      // 기업 비고: 국내외/국가는 별도 컬럼이 없어 note에 보존
      const noteParts: string[] = [];
      if (r.domestic) noteParts.push(`국내외:${r.domestic}`);
      if (r.country) noteParts.push(`국가:${r.country}`);

      const companyData = {
        orgType: r.orgType || null,
        joinYear: r.joinYear ?? null,
        addressDetail: r.addressDetail || null,
        ...(noteParts.length ? { note: noteParts.join(' / ') } : {}),
      };
      const collabData: Record<string, boolean | string | null> = {};
      for (const k of COLLAB_BOOLS) collabData[k] = r[k] ?? false;

      try {
        await prisma.$transaction(async (tx) => {
          let companyId = r.id || null;

          if (!companyId) {
            // 신규 행
            const code = await nextCode(tx, 'company');
            const created = await tx.company.create({
              data: { code, name: r.name, ...companyData, collaboration: { create: collabData } },
            });
            companyId = created.id;
            results.push({ ok: true, id: companyId, name: r.name });
          } else {
            // 기존 행 — 낙관적 락
            const upd = await tx.company.updateMany({
              where: { id: companyId, version: r.version ?? -1 },
              data: { name: r.name, ...companyData, version: { increment: 1 } },
            });
            if (upd.count === 0) throw new Error('__CONFLICT__');
            // 협업정보 upsert
            await tx.collaboration.upsert({
              where: { companyId },
              update: collabData,
              create: { companyId, ...collabData },
            });
            results.push({ ok: true, id: companyId, name: r.name });
          }

          // 신규 행이면 협업은 위 create 로 이미 생성됨. 담당자/대표자 처리(이름 기준 upsert).
          await upsertPerson(tx, companyId, r.contactName, r.contactPosition || null, r.contactPhone, r.contactEmail);
          await upsertPerson(tx, companyId, r.ceoName, '대표', r.ceoPhone, r.ceoEmail);
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : '오류';
        if (msg === '__CONFLICT__') results.push({ ok: false, id: r.id ?? undefined, name: r.name, error: '충돌(다른 사용자가 먼저 수정)' });
        else if (msg.includes('Unique')) results.push({ ok: false, name: r.name, error: '기관명 중복' });
        else results.push({ ok: false, name: r.name, error: msg });
      }
    }

    return ok({ results, total: rawRows.length, success: results.filter((x) => x.ok).length });
  });
}

/** 회사 내 같은 이름 실무자가 있으면 갱신, 없으면 생성. (그리드 재저장 시 중복 방지) */
async function upsertPerson(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  companyId: string,
  name?: string | null,
  position?: string | null,
  phone?: string | null,
  email?: string | null,
) {
  const nm = (name || '').trim();
  if (!nm) return;
  const existing = await tx.contactPerson.findFirst({ where: { companyId, name: nm } });
  const data = { position: position || undefined, phone: phone || undefined, email: email || undefined };
  if (existing) {
    await tx.contactPerson.update({ where: { id: existing.id }, data });
  } else {
    const code = await nextCode(tx, 'person');
    await tx.contactPerson.create({ data: { code, companyId, name: nm, ...data } });
  }
}
