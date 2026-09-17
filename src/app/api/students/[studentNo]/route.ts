/**
 * GET /api/students/:studentNo — 상세(실명 + 연결 산학 + 인턴십(수동) + 상담 + 취업기업 매칭)
 * PUT /api/students/:studentNo — 수정(상담·인턴십 replace-all)
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, fail, handle, ConflictError } from '@/lib/http';
import { studentUpdateSchema } from '@/lib/validation';
import { maskName } from '@/lib/list-filters';
import { toProgramMap, type StudentDetail } from '@/lib/student-shape';

type Ctx = { params: { studentNo: string } };

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireRole('ADMIN');
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
      version: s.version,
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
    const user = await requireRole('ADMIN');
    const parsed = studentUpdateSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? '입력값 오류', 422);
    const d = parsed.data;

    const exists = await prisma.student.findUnique({ where: { studentNo: params.studentNo }, select: { version: true } });
    if (!exists) return fail('학생을 찾을 수 없습니다.', 404);

    const counselings = d.counselings === undefined ? undefined
      : d.counselings.filter((c) => c.counselDate || c.counselor || c.content);
    const internships = d.internships === undefined ? undefined
      : d.internships.filter((i) => i.internshipType || i.companyName || i.activityDate || i.durationWeeks != null);

    await prisma.$transaction(async (tx) => {
      // 낙관적 락. 상담·인턴십이 replace-all 이라 락 없이는 동시 수정 시 통째로 덮인다.
      // updateMany 로 version 이 맞을 때만 갱신하고, 안 맞으면 트랜잭션을 되돌린다.
      const upd = await tx.student.updateMany({
        where: { studentNo: params.studentNo, version: d.version },
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
          version: { increment: 1 },
        },
      });
      if (upd.count === 0) throw new ConflictError('다른 사용자가 먼저 수정했습니다. 새로고침 후 다시 시도하세요.');
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
    const after = await prisma.student.findUnique({ where: { studentNo: params.studentNo }, select: { version: true } });
    return ok({ studentNo: params.studentNo, version: after?.version });
  });
}

/**
 * DELETE /api/students/:studentNo — 완전 삭제
 *
 * 학번이 기본키라 잘못 넣은 학번은 고칠 수가 없다. 임의 학번으로 만든 학생을
 * 치우려면 지우는 수밖에 없어서 소프트 삭제가 아니라 실제 삭제로 둔다.
 *
 * 딸린 것은 스키마의 Cascade 로 같이 지워진다. 그중 상담과 수동 인턴십은 사람이
 * 손으로 넣은 값이라 되살릴 길이 없고, 산학·인턴십 실적 연결은 실적 엑셀을 다시
 * 올리면 돌아온다. 무엇이 사라지는지 세어서 돌려주고 화면에서 먼저 보여 준다.
 */
export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireRole('ADMIN');
    const s = await prisma.student.findUnique({
      where: { studentNo: params.studentNo },
      select: {
        name: true,
        _count: { select: { counselings: true, manualInternships: true, projects: true, internships: true } },
      },
    });
    if (!s) return fail('학생을 찾을 수 없습니다.', 404);

    await prisma.student.delete({ where: { studentNo: params.studentNo } });
    return ok({
      deleted: true,
      studentNo: params.studentNo,
      name: s.name,
      counselings: s._count.counselings,
      internships: s._count.manualInternships,
      projectLinks: s._count.projects + s._count.internships,
    });
  });
}
