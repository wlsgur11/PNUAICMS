/**
 * GET /api/students/stats — 학생 대시보드/통계분석 집계 + 관리필요 학생(연결 C)
 */
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, handle } from '@/lib/http';
import { maskName } from '@/lib/list-filters';
import { ENUMS } from '@/lib/enums';
import type { StudentListRow } from '@/lib/student-shape';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    await requireRole('ADMIN');
    const students = await prisma.student.findMany({
      include: {
        _count: { select: { counselings: true, projects: true, manualInternships: true } },
      },
    });

    const isGraduated = (g: string | null) => !!(g && g.trim());
    const toRow = (s: (typeof students)[number]): StudentListRow => ({
      studentNo: s.studentNo,
      nameMasked: s.name ? maskName(s.name) : (s.nameMasked || '-'),
      department: s.department,
      major: s.major,
      grade: s.grade,
      careerGoal: s.careerGoal,
      graduationDate: s.graduationDate,
      counselCount: s._count.counselings,
      updatedAt: s.updatedAt.toISOString(),
    });

    const total = students.length;
    const graduated = students.filter((s) => isGraduated(s.graduationDate)).length;
    const highGrade = students.filter((s) => (s.grade ?? 0) >= 3 && !isGraduated(s.graduationDate)).length;
    const internParticipants = students.filter((s) => s._count.manualInternships > 0).length;
    const projectParticipants = students.filter((s) => s._count.projects > 0).length;

    const gradeDistribution = [1, 2, 3, 4].map((grade) => ({ grade, count: students.filter((s) => s.grade === grade).length }));

    const recent = [...students]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 5)
      .map(toRow);

    // 관리 필요: 3학년 이상(졸업 제외) 이고 (상담 0회 또는 산학·인턴십 둘 다 미참여)
    const needsAttention = students
      .filter((s) => (s.grade ?? 0) >= 3 && !isGraduated(s.graduationDate))
      .filter((s) => s._count.counselings === 0 || (s._count.projects === 0 && s._count.manualInternships === 0))
      .map(toRow)
      .slice(0, 20);

    const departmentCounts = [...new Set(students.map((s) => s.department).filter(Boolean))]
      .map((label) => ({ label: label as string, count: students.filter((s) => s.department === label).length }))
      .sort((a, b) => b.count - a.count);

    const careerCounts = (ENUMS.CAREER_GOAL as readonly string[])
      .map((label) => ({ label, count: students.filter((s) => (s.careerGoal || '') === label).length }))
      .filter((x) => x.count > 0);

    return ok({ total, graduated, highGrade, internParticipants, projectParticipants, gradeDistribution, recent, needsAttention, departmentCounts, careerCounts });
  });
}
