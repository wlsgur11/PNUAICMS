/**
 * src/lib/records-import.ts
 * ---------------------------------------------------------
 * 파싱 결과 → DB 적재. 전체 교체(트랜잭션). 기업 normName 매칭.
 * 대량 데이터(학생 수백~수천)도 시간 내에 끝나도록 일괄(createMany) 처리한다.
 * (행마다 await 하면 서버리스 함수 시간제한을 넘겨 504 가 난다.)
 */
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
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

  // 학생 이름 수집(프로젝트+인턴십). 같은 학번이면 이름 있는 값으로 채운다.
  const studentName = new Map<string, string>();
  const noteStudent = (studentNo: string, name: string) => {
    const nm = (name || '').trim();
    const cur = studentName.get(studentNo);
    if (cur === undefined || (!cur && nm)) studentName.set(studentNo, nm);
  };
  for (const p of parsed.projects) for (const s of p.students) noteStudent(s.studentNo, s.name);
  for (const it of parsed.internships) for (const s of it.students) noteStudent(s.studentNo, s.name);

  // 연구실 키(교수|연구실) 수집
  const labKeys = new Map<string, { prof: string; lab: string | null }>();
  for (const p of parsed.projects) {
    if (!p.professorName) continue;
    const key = `${p.professorName}|${p.labName ?? ''}`;
    if (!labKeys.has(key)) labKeys.set(key, { prof: p.professorName, lab: p.labName });
  }

  return prisma.$transaction(async (tx) => {
    // 전체 교체: 실적만 삭제 (학생·연구실·기업·분과·컨택은 보존)
    await tx.projectStudent.deleteMany({});
    await tx.internshipStudent.deleteMany({});
    await tx.project.deleteMany({});
    await tx.internship.deleteMany({});

    // 1) 학생 일괄 생성(신규만; 기존 학생은 보존 — 수동 입력값 유지)
    const studentNos = [...studentName.keys()];
    if (studentNos.length) {
      await tx.student.createMany({
        data: studentNos.map((sno) => {
          const nm = studentName.get(sno) || '';
          return { studentNo: sno, name: nm || null, nameMasked: nm ? mask(nm) : null };
        }),
        skipDuplicates: true,
      });
    }

    // 2) 연구실 일괄: 기존 조회 → 누락분만 생성 → 키→id 맵
    const labMap = new Map<string, string>();
    for (const l of await tx.lab.findMany()) labMap.set(`${l.professorName}|${l.labName ?? ''}`, l.id);
    const missingLabs = [...labKeys.values()].filter((lk) => !labMap.has(`${lk.prof}|${lk.lab ?? ''}`));
    if (missingLabs.length) {
      const rows = missingLabs.map((lk) => ({ id: randomUUID(), professorName: lk.prof, labName: lk.lab }));
      await tx.lab.createMany({ data: rows });
      for (const r of rows) labMap.set(`${r.professorName}|${r.labName ?? ''}`, r.id);
    }

    // 3) 프로젝트 + 참여학생 일괄(id 를 직접 생성해 연결을 한 번에 insert)
    const projectRows: Prisma.ProjectCreateManyInput[] = [];
    const projectStudentRows: Prisma.ProjectStudentCreateManyInput[] = [];
    for (const p of parsed.projects) {
      const companyId = matchCompany(p.companyNameRaw);
      if (p.companyNameRaw && !companyId) noteUnmatched(p.companyNameRaw);
      const labId = p.professorName ? (labMap.get(`${p.professorName}|${p.labName ?? ''}`) ?? null) : null;
      const id = randomUUID();
      projectRows.push({
        id, year: p.year, dept: p.dept, category: p.category, type: p.type, title: p.title,
        period: p.period, track: p.track, cntPhd: p.cntPhd, cntMaster: p.cntMaster,
        cntUndergrad: p.cntUndergrad, studentNamesRaw: p.studentNamesRaw,
        companyId, companyNameRaw: p.companyNameRaw, labId,
      });
      for (const s of p.students) projectStudentRows.push({ projectId: id, studentNo: s.studentNo });
    }
    if (projectRows.length) await tx.project.createMany({ data: projectRows });
    if (projectStudentRows.length) await tx.projectStudent.createMany({ data: projectStudentRows, skipDuplicates: true });

    // 4) 인턴십 + 참여학생 일괄 (참여학생을 채워야 기업/학생 양쪽에서 보인다)
    const internshipRows: Prisma.InternshipCreateManyInput[] = [];
    const internshipStudentRows: Prisma.InternshipStudentCreateManyInput[] = [];
    for (const it of parsed.internships) {
      const companyId = matchCompany(it.companyNameRaw);
      if (it.companyNameRaw && !companyId) noteUnmatched(it.companyNameRaw);
      const id = randomUUID();
      internshipRows.push({
        id, year: it.year, programName: it.programName, hostType: it.hostType, method: it.method,
        domestic: it.domestic, country: it.country, startDate: it.startDate, endDate: it.endDate,
        weeks: it.weeks, hoursPerWeek: it.hoursPerWeek, credits: it.credits,
        cntCSE: it.cntCSE, cntDS: it.cntDS, cntNonSW: it.cntNonSW,
        empSW: it.empSW, empNonSW: it.empNonSW,
        companyId, companyNameRaw: it.companyNameRaw,
      });
      for (const s of it.students) internshipStudentRows.push({ internshipId: id, studentNo: s.studentNo });
    }
    if (internshipRows.length) await tx.internship.createMany({ data: internshipRows });
    if (internshipStudentRows.length) await tx.internshipStudent.createMany({ data: internshipStudentRows, skipDuplicates: true });

    // 5) 연도별 현황판 값 (엑셀 전체현황 시트) upsert
    for (const ys of parsed.yearStats) {
      const { year, ...data } = ys;
      await tx.yearStat.upsert({ where: { year }, update: data, create: { year, ...data } });
    }

    return {
      projects: parsed.projects.length,
      internships: parsed.internships.length,
      students: studentNos.length,
      unmatchedCompanies: [...unmatched.values()].sort(),
    };
  }, { timeout: 120000 });
}
