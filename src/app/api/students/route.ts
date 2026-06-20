/**
 * GET  /api/students  — 학생 목록 (필터·검색, 마스킹)  쿼리: q, department, major, grade, status
 * POST /api/students  — 학생 등록 (상담·인턴십 배열 포함)
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/http';
import { maskName } from '@/lib/list-filters';
import { studentCreateSchema } from '@/lib/validation';
import type { StudentListRow } from '@/lib/student-shape';

function buildWhere(sp: URLSearchParams): Prisma.StudentWhereInput {
  const where: Prisma.StudentWhereInput = {};
  const dept = sp.get('department'); if (dept) where.department = dept;
  const major = sp.get('major'); if (major) where.major = major;
  const grade = sp.get('grade'); if (grade) where.grade = Number(grade);
  const status = sp.get('status'); // '재학' | '졸업'
  if (status === '졸업') where.graduationDate = { not: null };
  if (status === '재학') where.OR = [{ graduationDate: null }, { graduationDate: '' }];
  const q = sp.get('q')?.trim();
  if (q) {
    where.AND = [{ OR: [
      { name: { contains: q } },
      { studentNo: { contains: q } },
      { phone: { contains: q } },
    ] }];
  }
  return where;
}

export async function GET(req: Request) {
  return handle(async () => {
    await requireRole('ADMIN');
    const sp = new URL(req.url).searchParams;
    const items = await prisma.student.findMany({
      where: buildWhere(sp),
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { counselings: true } } },
    });
    const rows: StudentListRow[] = items.map((s) => ({
      studentNo: s.studentNo,
      nameMasked: s.name ? maskName(s.name) : (s.nameMasked || '-'),
      department: s.department,
      major: s.major,
      grade: s.grade,
      careerGoal: s.careerGoal,
      graduationDate: s.graduationDate,
      counselCount: s._count.counselings,
      updatedAt: s.updatedAt.toISOString(),
    }));
    const departments = [...new Set(items.map((s) => s.department).filter(Boolean))].sort() as string[];
    const majors = [...new Set(items.map((s) => s.major).filter(Boolean))].sort() as string[];
    return ok({ rows, facets: { departments, majors } });
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
        nameMasked: maskName(d.name),
        department: d.department ?? null,
        major: d.major ?? null,
        grade: d.grade ?? null,
        gpa: d.gpa ?? null,
        careerGoal: d.careerGoal ?? null,
        phone: d.phone ?? null,
        email: d.email ?? null,
        certificates: d.certificates ?? [],
        foreignLanguages: d.foreignLanguages ?? [],
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
