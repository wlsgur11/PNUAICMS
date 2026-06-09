/**
 * src/lib/swcu-import.ts
 * 파싱 결과를 해당 연도만 전체교체로 적재. 다른 연도는 무영향.
 */
import { prisma } from '@/lib/db';
import type { ParsedSwcu } from '@/lib/swcu-parse';

export type SwcuImportSummary = {
  year: number;
  indicators: number;
  raws: number;
};

export async function importSwcu(parsed: ParsedSwcu): Promise<SwcuImportSummary> {
  const { year } = parsed;
  await prisma.$transaction([
    prisma.swcuIndicator.deleteMany({ where: { year } }),
    prisma.swcuRaw.deleteMany({ where: { year } }),
    prisma.swcuYear.upsert({
      where: { year },
      create: { year, university: parsed.university, submittedAt: parsed.submittedAt },
      update: { university: parsed.university, submittedAt: parsed.submittedAt },
    }),
    prisma.swcuIndicator.createMany({
      data: parsed.indicators.map((i) => ({ year, ...i })),
    }),
    prisma.swcuRaw.createMany({
      data: parsed.raws.map((r) => ({ year, ...r })),
    }),
  ]);
  return { year, indicators: parsed.indicators.length, raws: parsed.raws.length };
}
