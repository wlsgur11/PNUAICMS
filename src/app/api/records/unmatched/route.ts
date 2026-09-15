/**
 * GET  /api/records/unmatched — CMS 기업에 안 붙은 실적의 원본 기업명 목록
 * POST /api/records/unmatched — 원본명 하나를 기존 기업의 별칭으로 등록하고 실적을 끌어옴
 *
 * 실적 엑셀은 우리가 고칠 수 없다. 담당자가 '(쭈)폭씨', 'Bear Robotics', '에이비일팔공'
 * 처럼 적어 보내도 CMS 쪽에서 "이 기업은 이렇게도 불린다" 를 적어 두면 다음부터 계속 붙는다.
 */
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/http';
import { normCompany } from '@/lib/normalize';
import { autoLinkRecords, findAliasConflict } from '@/lib/company-autolink';

export async function GET() {
  return handle(async () => {
    await requireRole('ADMIN');

    const [projs, ints] = await Promise.all([
      prisma.project.groupBy({
        by: ['companyNameRaw'],
        where: { companyId: null, companyNameRaw: { not: null } },
        _count: { _all: true },
      }),
      prisma.internship.groupBy({
        by: ['companyNameRaw'],
        where: { companyId: null, companyNameRaw: { not: null } },
        _count: { _all: true },
      }),
    ]);

    // 정규화 키로 묶는다. '(주)센디' 와 '주식회사 센디' 는 이미 같은 기업이라
    // 목록에 두 줄로 나오면 같은 걸 두 번 붙이게 된다
    type Row = { name: string; projects: number; internships: number };
    const rows = new Map<string, Row>();
    const add = (raw: string | null, n: number, side: 'projects' | 'internships') => {
      const key = normCompany(raw || '');
      if (!key) return;
      const cur = rows.get(key) ?? { name: (raw || '').trim(), projects: 0, internships: 0 };
      cur[side] += n;
      rows.set(key, cur);
    };
    for (const p of projs) add(p.companyNameRaw, p._count._all, 'projects');
    for (const i of ints) add(i.companyNameRaw, i._count._all, 'internships');

    // 건수 많은 곳부터. 붙여서 얻는 게 큰 순서다
    const list = [...rows.values()].sort(
      (a, b) => b.projects + b.internships - (a.projects + a.internships) || a.name.localeCompare(b.name, 'ko'),
    );
    return ok({ total: list.length, rows: list });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireRole('ADMIN');
    const { raw, companyId } = (await req.json()) as { raw?: string; companyId?: string };
    const name = (raw || '').trim();
    if (!name || !companyId) return fail('원본 기업명과 대상 기업을 모두 지정하세요.', 400);

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, aliases: true },
    });
    if (!company) return fail('대상 기업을 찾을 수 없습니다.', 404);

    const key = normCompany(name);
    if (!key) return fail('기업명이 비어 있습니다.', 400);

    // 이미 이름이나 별칭으로 잡히는 경우. 별칭을 더 늘리지 않고 연결만 다시 돌린다
    const already = [company.name, ...company.aliases].some((n) => normCompany(n) === key);
    if (!already) {
      const clash = await findAliasConflict(company.id, [name]);
      if (clash) return fail(`'${clash.alias}' 은(는) 이미 '${clash.owner}' 이(가) 쓰고 있습니다.`, 409);
      await prisma.company.update({
        where: { id: company.id },
        data: { aliases: { push: name }, updatedBy: user.email, version: { increment: 1 } },
      });
      company.aliases = [...company.aliases, name];
    }

    const linked = await autoLinkRecords(company.id, company.name, company.aliases);
    return ok({ companyId: company.id, companyName: company.name, alias: already ? null : name, linked });
  });
}
