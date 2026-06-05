/**
 * src/lib/records-import.ts
 * ---------------------------------------------------------
 * 파싱 결과 → DB 적재. 전체 교체(트랜잭션). 기업 normName 매칭.
 */
import { prisma } from './db';
import { normCompany } from './normalize';
import type { ParseResult } from './records-parse';

/** 이름 마스킹: 2글자→끝, 3글자+→가운데 */
function mask(name: string): string {
  const n = (name || '').trim();
  if (n.length <= 1) return n;
  if (n.length === 2) return n[0] + '*';
  return n[0] + '*'.repeat(n.length - 2) + n[n.length - 1];
}

export type ImportSummary = {
  projects: number; internships: number; students: number; unmatchedCompanies: string[];
};

export async function importRecords(parsed: ParseResult): Promise<ImportSummary> {
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  const byNorm = new Map<string, string>();
  for (const c of companies) byNorm.set(normCompany(c.name), c.id);
  const matchCompany = (raw: string | null): string | null =>
    raw ? (byNorm.get(normCompany(raw)) ?? null) : null;
  // 미매칭은 정규화 키로 모아 표기 중복 제거(대표 원본명 1개만 노출)
  const unmatched = new Map<string, string>();
  const noteUnmatched = (raw: string) => {
    const k = normCompany(raw);
    if (k && !unmatched.has(k)) unmatched.set(k, raw);
  };

  return prisma.$transaction(async (tx) => {
    // 전체 교체: 실적만 삭제 (학생·연구실·기업·분과·컨택은 보존)
    await tx.projectStudent.deleteMany({});
    await tx.internshipStudent.deleteMany({});
    await tx.project.deleteMany({});
    await tx.internship.deleteMany({});

    const seenStudents = new Set<string>();
    const labCache = new Map<string, string>();

    const ensureLab = async (prof: string | null, lab: string | null): Promise<string | null> => {
      if (!prof) return null;
      const key = `${prof}|${lab ?? ''}`;
      const cached = labCache.get(key);
      if (cached) return cached;
      const found = await tx.lab.findFirst({ where: { professorName: prof, labName: lab } });
      const id = found?.id ?? (await tx.lab.create({ data: { professorName: prof, labName: lab } })).id;
      labCache.set(key, id);
      return id;
    };
    const ensureStudent = async (studentNo: string, name: string) => {
      if (seenStudents.has(studentNo)) return;
      await tx.student.upsert({
        where: { studentNo },
        update: { nameMasked: mask(name) },
        create: { studentNo, nameMasked: mask(name) },
      });
      seenStudents.add(studentNo);
    };

    for (const p of parsed.projects) {
      const companyId = matchCompany(p.companyNameRaw);
      if (p.companyNameRaw && !companyId) noteUnmatched(p.companyNameRaw);
      const labId = await ensureLab(p.professorName, p.labName);
      const proj = await tx.project.create({
        data: {
          year: p.year, dept: p.dept, category: p.category, type: p.type, title: p.title,
          period: p.period, track: p.track, cntPhd: p.cntPhd, cntMaster: p.cntMaster,
          cntUndergrad: p.cntUndergrad, studentNamesRaw: p.studentNamesRaw,
          companyId, companyNameRaw: p.companyNameRaw, labId,
        },
      });
      for (const s of p.students) {
        await ensureStudent(s.studentNo, s.name);
        await tx.projectStudent.create({ data: { projectId: proj.id, studentNo: s.studentNo } });
      }
    }

    for (const it of parsed.internships) {
      const companyId = matchCompany(it.companyNameRaw);
      if (it.companyNameRaw && !companyId) noteUnmatched(it.companyNameRaw);
      await tx.internship.create({
        data: {
          year: it.year, programName: it.programName, hostType: it.hostType, method: it.method,
          domestic: it.domestic, country: it.country, startDate: it.startDate, endDate: it.endDate,
          weeks: it.weeks, hoursPerWeek: it.hoursPerWeek, credits: it.credits,
          cntCSE: it.cntCSE, cntDS: it.cntDS, cntNonSW: it.cntNonSW,
          empSW: it.empSW, empNonSW: it.empNonSW,
          companyId, companyNameRaw: it.companyNameRaw,
        },
      });
    }

    return {
      projects: parsed.projects.length,
      internships: parsed.internships.length,
      students: seenStudents.size,
      unmatchedCompanies: [...unmatched.values()].sort(),
    };
  }, { timeout: 120000 });
}
