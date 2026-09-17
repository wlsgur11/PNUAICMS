/**
 * GET  /api/students  — 학생 목록 (필터·검색)  쿼리: q, department, major, grade, status
 * POST /api/students  — 학생 등록 (상담·인턴십 배열 포함)
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/http';
import { studentWhere, studentOrderBy } from '@/lib/list-filters';
import { studentCreateSchema } from '@/lib/validation';
import type { StudentListRow } from '@/lib/student-shape';

/**
 * 드롭다운 값은 전체 학생에서 뽑는다. 검색 결과에서 뽑으면 학과를 한 번 고른 순간
 * 그 학과만 목록에 남아 다른 학과로 못 바꾸게 된다(초기화해야만 풀림).
 * 산학협력, 인턴십 목록도 같은 방식으로 전체에서 뽑는다.
 */
async function facets() {
  const [depRows, majorRows, careerRows] = await Promise.all([
    prisma.student.findMany({
      where: { department: { not: null } },
      distinct: ['department'], select: { department: true }, orderBy: { department: 'asc' },
    }),
    prisma.student.findMany({
      where: { major: { not: null } },
      distinct: ['major'], select: { major: true }, orderBy: { major: 'asc' },
    }),
    prisma.student.findMany({
      where: { careerGoal: { not: null } },
      distinct: ['careerGoal'], select: { careerGoal: true }, orderBy: { careerGoal: 'asc' },
    }),
  ]);
  const clean = (vals: (string | null)[]) =>
    [...new Set(vals.filter((v): v is string => !!v && v.trim().length > 0))];
  return {
    departments: clean(depRows.map((r) => r.department)),
    majors: clean(majorRows.map((r) => r.major)),
    careerGoals: clean(careerRows.map((r) => r.careerGoal)),
  };
}

export async function GET(req: Request) {
  return handle(async () => {
    await requireRole('ADMIN');
    const sp = new URL(req.url).searchParams;
    const items = await prisma.student.findMany({
      where: studentWhere(sp),
      orderBy: studentOrderBy(sp),
      include: { _count: { select: { counselings: true } } },
    });
    const rows: StudentListRow[] = items.map((s) => ({
      studentNo: s.studentNo,
      studentName: s.name || s.nameMasked || '-',
      department: s.department,
      major: s.major,
      grade: s.grade,
      careerGoal: s.careerGoal,
      graduationDate: s.graduationDate,
      counselCount: s._count.counselings,
      updatedAt: s.updatedAt.toISOString(),
    }));
    return ok({ rows, facets: await facets() });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireRole('ADMIN');
    const parsed = studentCreateSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? '입력값 오류', 422);
    const d = parsed.data;

    const exists = await prisma.student.findUnique({ where: { studentNo: d.studentNo }, select: { studentNo: true } });
    if (exists) return fail('이미 등록된 학번입니다.', 409);

    const counselings = (d.counselings ?? []).filter((c) => c.counselDate || c.counselor || c.content);
    const internships = (d.internships ?? []).filter((i) => i.internshipType || i.companyName || i.activityDate || i.durationWeeks != null);

    await prisma.student.create({
      data: {
        studentNo: d.studentNo,
        name: d.name,
        department: d.department ?? null,
        major: d.major ?? null,
        grade: d.grade ?? null,
        gpa: d.gpa ?? null,
        careerGoal: d.careerGoal ?? null,
        phone: d.phone ?? null,
        email: d.email ?? null,
        certificates: d.certificates ?? [],
        foreignLanguages: d.foreignLanguages ?? [],
        clubs: d.clubs ?? [],
        graduationDate: d.graduationDate ?? null,
        employmentCompany: d.employmentCompany ?? null,
        swPrograms: d.swPrograms ? (d.swPrograms as Prisma.InputJsonValue) : undefined,
        bootcampPrograms: d.bootcampPrograms ? (d.bootcampPrograms as Prisma.InputJsonValue) : undefined,
        createdBy: user.email,
        updatedBy: user.email,
        counselings: { create: counselings.map((c) => ({ counselDate: c.counselDate || null, counselor: c.counselor || null, content: c.content || null, createdBy: user.email })) },
        manualInternships: { create: internships.map((i) => ({ internshipType: i.internshipType || null, companyName: i.companyName || null, durationWeeks: i.durationWeeks ?? null, activityDate: i.activityDate || null, createdBy: user.email })) },
      },
    });
    return ok({ studentNo: d.studentNo });
  });
}
