/**
 * GET /api/students/:studentNo — 상세(실명 + 연결 산학 + 인턴십(수동) + 상담 + 취업기업 매칭)
 * PUT /api/students/:studentNo — 수정(상담·인턴십 replace-all)
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/http';
import { studentUpdateSchema } from '@/lib/validation';
import { maskName } from '@/lib/list-filters';
import { toProgramMap, type StudentDetail } from '@/lib/student-shape';

type Ctx = { params: { studentNo: string } };

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireUser();
    const s = await prisma.student.findUnique({
      where: { studentNo: params.studentNo },
      include: {
        counselings: { orderBy: { counselDate: 'asc' } },
        projects: { include: { project: { include: { company: { select: { id: true, name: true } }, lab: { select: { professorName: true } } } } } },
        manualInternships: { orderBy: { activityDate: 'asc' } },
      },
    });
    if (!s) return fail('학생을 찾을 수 없습니다.', 404);

    // 취업기업 + 인턴십 기업명을 한 번에 매칭(정확일치)
    const names = new Set<string>();
    if (s.employmentCompany?.trim()) names.add(s.employmentCompany.trim());
    for (const it of s.manualInternships) if (it.companyName?.trim()) names.add(it.companyName.trim());
    const companyIdByName = new Map<string, string>();
    if (names.size) {
      const found = await prisma.company.findMany({ where: { name: { in: [...names] }, isActive: true }, select: { id: true, name: true } });
      for (const c of found) companyIdByName.set(c.name, c.id);
    }
    const employmentCompanyId = s.employmentCompany?.trim() ? (companyIdByName.get(s.employmentCompany.trim()) ?? null) : null;

    const detail: StudentDetail = {
      studentNo: s.studentNo,
      name: s.name,
      nameMasked: s.name ? maskName(s.name) : s.nameMasked,
      department: s.department,
      major: s.major,
      grade: s.grade,
      gpa: s.gpa,
      careerGoal: s.careerGoal,
      phone: s.phone,
      email: s.email,
      certificates: s.certificates,
      foreignLanguages: s.foreignLanguages,
      graduationDate: s.graduationDate,
      employmentCompany: s.employmentCompany,
      employmentCompanyId,
      swPrograms: toProgramMap(s.swPrograms),
      bootcampPrograms: toProgramMap(s.bootcampPrograms),
      updatedAt: s.updatedAt.toISOString(),
      updatedBy: s.updatedBy,
      counselings: s.counselings.map((c) => ({ id: c.id, counselDate: c.counselDate ?? '', counselor: c.counselor ?? '', content: c.content ?? '' })),
      projects: s.projects.map((ps) => ({
        id: ps.project.id,
        year: ps.project.year,
        title: ps.project.title,
        period: ps.project.period,
        professorName: ps.project.lab?.professorName ?? null,
        companyId: ps.project.company?.id ?? null,
        companyName: ps.project.company?.name ?? ps.project.companyNameRaw ?? '-',
      })),
      internships: s.manualInternships.map((it) => ({
        id: it.id,
        internshipType: it.internshipType ?? '',
        companyName: it.companyName ?? '',
        companyId: it.companyName?.trim() ? (companyIdByName.get(it.companyName.trim()) ?? null) : null,
        durationWeeks: it.durationWeeks,
        activityDate: it.activityDate ?? '',
      })),
    };
    return ok(detail);
  });
}

export async function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const parsed = studentUpdateSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? '입력값 오류', 422);
    const d = parsed.data;

    const exists = await prisma.student.findUnique({ where: { studentNo: params.studentNo }, select: { studentNo: true } });
    if (!exists) return fail('학생을 찾을 수 없습니다.', 404);

    const counselings = d.counselings === undefined ? undefined
      : d.counselings.filter((c) => c.counselDate || c.counselor || c.content);
    const internships = d.internships === undefined ? undefined
      : d.internships.filter((i) => i.internshipType || i.companyName || i.activityDate || i.durationWeeks != null);

    await prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { studentNo: params.studentNo },
        data: {
          ...(d.name !== undefined ? { name: d.name, nameMasked: maskName(d.name) } : {}),
          ...(d.department !== undefined ? { department: d.department } : {}),
          ...(d.major !== undefined ? { major: d.major } : {}),
          ...(d.grade !== undefined ? { grade: d.grade } : {}),
          ...(d.gpa !== undefined ? { gpa: d.gpa } : {}),
          ...(d.careerGoal !== undefined ? { careerGoal: d.careerGoal } : {}),
          ...(d.phone !== undefined ? { phone: d.phone } : {}),
          ...(d.email !== undefined ? { email: d.email } : {}),
          ...(d.certificates !== undefined ? { certificates: d.certificates } : {}),
          ...(d.foreignLanguages !== undefined ? { foreignLanguages: d.foreignLanguages } : {}),
          ...(d.graduationDate !== undefined ? { graduationDate: d.graduationDate } : {}),
          ...(d.employmentCompany !== undefined ? { employmentCompany: d.employmentCompany } : {}),
          ...(d.swPrograms !== undefined ? { swPrograms: d.swPrograms ? (d.swPrograms as Prisma.InputJsonValue) : Prisma.JsonNull } : {}),
          ...(d.bootcampPrograms !== undefined ? { bootcampPrograms: d.bootcampPrograms ? (d.bootcampPrograms as Prisma.InputJsonValue) : Prisma.JsonNull } : {}),
          updatedBy: user.email,
        },
      });
      if (counselings !== undefined) {
        await tx.counseling.deleteMany({ where: { studentNo: params.studentNo } });
        if (counselings.length) {
          await tx.counseling.createMany({ data: counselings.map((c) => ({ studentNo: params.studentNo, counselDate: c.counselDate || null, counselor: c.counselor || null, content: c.content || null, createdBy: user.email })) });
        }
      }
      if (internships !== undefined) {
        await tx.studentInternship.deleteMany({ where: { studentNo: params.studentNo } });
        if (internships.length) {
          await tx.studentInternship.createMany({ data: internships.map((i) => ({ studentNo: params.studentNo, internshipType: i.internshipType || null, companyName: i.companyName || null, durationWeeks: i.durationWeeks ?? null, activityDate: i.activityDate || null, createdBy: user.email })) });
        }
      }
    });
    return ok({ studentNo: params.studentNo });
  });
}
