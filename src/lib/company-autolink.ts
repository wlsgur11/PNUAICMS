/**
 * src/lib/company-autolink.ts
 * ---------------------------------------------------------
 * 기업을 CMS에 새로 등록/재활성할 때, 이름이 맞는 기존 미매칭 실적
 * (Project/Internship 의 companyNameRaw)을 그 기업에 자동 연결.
 */
import { prisma } from './db';
import { normCompany } from './normalize';

export async function autoLinkRecords(companyId: string, companyName: string): Promise<number> {
  const target = normCompany(companyName);
  if (!target) return 0;
  let linked = 0;

  const projs = await prisma.project.findMany({
    where: { companyId: null, companyNameRaw: { not: null } },
    select: { id: true, companyNameRaw: true },
  });
  for (const p of projs) {
    if (normCompany(p.companyNameRaw || '') === target) {
      await prisma.project.update({ where: { id: p.id }, data: { companyId } });
      linked++;
    }
  }

  const ints = await prisma.internship.findMany({
    where: { companyId: null, companyNameRaw: { not: null } },
    select: { id: true, companyNameRaw: true },
  });
  for (const it of ints) {
    if (normCompany(it.companyNameRaw || '') === target) {
      await prisma.internship.update({ where: { id: it.id }, data: { companyId } });
      linked++;
    }
  }
  return linked;
}
