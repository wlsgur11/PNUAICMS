/**
 * POST /api/companies/bulk-lookup — 활성 기업 전체에 자동조회 적용(빈 칸만 채움).
 *   교수님 요청: 업로드된 기업들에 한 번 클릭으로 외부 정보를 채워주는 흐름.
 *
 * 정책:
 *  - 이미 값이 있는 필드는 절대 덮어쓰지 않음(기존값 우선).
 *  - 채우는 대상: addressDetail, homepage, mainIndustry, summary, region, revenueScale,
 *    avgSalary, newcomerSalary.
 *  - 외부 API 부하/타임아웃 회피: 5개씩 동시 처리(배치).
 *
 * 응답: { total, processed, updated, skipped, sourceCounts, errors }
 */
export const runtime = 'nodejs';
export const maxDuration = 60;

import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, handle } from '@/lib/http';
import { lookupCompany } from '@/lib/lookup';

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === 'string') return v.trim() === '';
  return false;
}

export async function POST() {
  return handle(async () => {
    await requireRole('ADMIN');

    const companies = await prisma.company.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true,
        addressDetail: true, homepage: true, mainIndustry: true, summary: true,
        region: true, revenueScale: true, avgSalary: true, newcomerSalary: true,
      },
    });

    // 채울 필드가 하나라도 비어있는 기업만 대상
    const targets = companies.filter((c) =>
      isEmpty(c.addressDetail) || isEmpty(c.homepage) || isEmpty(c.mainIndustry) ||
      isEmpty(c.summary) || isEmpty(c.region) || isEmpty(c.revenueScale) ||
      isEmpty(c.avgSalary) || isEmpty(c.newcomerSalary)
    );
    const skipped = companies.length - targets.length;

    let updated = 0;
    const sourceCounts: Record<string, number> = {};
    const errors: { name: string; error: string }[] = [];

    // 배치 5개씩 동시 처리
    const BATCH = 5;
    for (let i = 0; i < targets.length; i += BATCH) {
      const batch = targets.slice(i, i + BATCH);
      await Promise.all(batch.map(async (c) => {
        try {
          const r = await lookupCompany(c.name);
          const patch: Record<string, unknown> = {};
          if (isEmpty(c.addressDetail) && r.addressDetail) patch.addressDetail = r.addressDetail;
          if (isEmpty(c.homepage) && r.homepage) patch.homepage = r.homepage;
          if (isEmpty(c.mainIndustry) && r.industry) patch.mainIndustry = r.industry;
          if (isEmpty(c.summary) && r.summary) patch.summary = r.summary;
          if (isEmpty(c.region) && r.region) patch.region = r.region;
          if (isEmpty(c.revenueScale) && r.revenueScale) patch.revenueScale = r.revenueScale;
          if (isEmpty(c.avgSalary) && r.avgSalary) patch.avgSalary = r.avgSalary;
          if (isEmpty(c.newcomerSalary) && r.newcomerSalary) patch.newcomerSalary = r.newcomerSalary;

          if (Object.keys(patch).length) {
            await prisma.company.update({
              where: { id: c.id },
              data: { ...patch, version: { increment: 1 } },
            });
            updated++;
            for (const s of r.sources) sourceCounts[s] = (sourceCounts[s] ?? 0) + 1;
          }
        } catch (e) {
          errors.push({ name: c.name, error: e instanceof Error ? e.message : '오류' });
        }
      }));
    }

    return ok({
      total: companies.length,
      processed: targets.length,
      updated,
      skipped,
      sourceCounts,
      errors,
    });
  });
}
