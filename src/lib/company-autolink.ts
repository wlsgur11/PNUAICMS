/**
 * src/lib/company-autolink.ts
 * ---------------------------------------------------------
 * 기업을 CMS에 새로 등록/재활성하거나 별칭을 추가할 때, 이름이 맞는 기존 미매칭 실적
 * (Project/Internship 의 companyNameRaw)을 그 기업에 자동 연결.
 */
import { prisma } from './db';
import { companyKeys, normCompany } from './normalize';

export async function autoLinkRecords(companyId: string, companyName: string, aliases?: string[]): Promise<number> {
  const targets = new Set(companyKeys({ name: companyName, aliases }));
  if (targets.size === 0) return 0;
  let linked = 0;

  const projs = await prisma.project.findMany({
    where: { companyId: null, companyNameRaw: { not: null } },
    select: { id: true, companyNameRaw: true },
  });
  const projIds = projs.filter((p) => targets.has(normCompany(p.companyNameRaw || ''))).map((p) => p.id);
  if (projIds.length) {
    await prisma.project.updateMany({ where: { id: { in: projIds } }, data: { companyId } });
    linked += projIds.length;
  }

  const ints = await prisma.internship.findMany({
    where: { companyId: null, companyNameRaw: { not: null } },
    select: { id: true, companyNameRaw: true },
  });
  const intIds = ints.filter((it) => targets.has(normCompany(it.companyNameRaw || ''))).map((it) => it.id);
  if (intIds.length) {
    await prisma.internship.updateMany({ where: { id: { in: intIds } }, data: { companyId } });
    linked += intIds.length;
  }
  return linked;
}

/**
 * 이 별칭이 다른 기업의 이름이나 별칭과 겹치는지 본다.
 * 겹치면 그 원본명이 어느 기업에 붙을지 정해지지 않아 조용히 엉뚱한 곳에 달린다.
 * 저장 전에 막는다.
 */
export async function findAliasConflict(
  companyId: string | null,
  aliases: string[],
): Promise<{ alias: string; owner: string } | null> {
  const keys = aliases.map(normCompany).filter(Boolean);
  if (keys.length === 0) return null;
  const others = await prisma.company.findMany({
    where: companyId ? { id: { not: companyId } } : {},
    select: { name: true, aliases: true },
  });
  const owner = new Map<string, string>();
  for (const c of others) for (const k of companyKeys(c)) if (!owner.has(k)) owner.set(k, c.name);
  for (let i = 0; i < keys.length; i++) {
    const hit = owner.get(keys[i]);
    if (hit) return { alias: aliases[i], owner: hit };
  }
  return null;
}
