'use client';
import useSWR from 'swr';
import PageHeader from '@/components/PageHeader';
import StudentForm, { type StudentFormData } from '@/components/StudentForm';
import type { StudentDetail, ProgramMap } from '@/lib/student-shape';

export default function EditStudentPage({ params }: { params: { studentNo: string } }) {
  const { data: s, isLoading } = useSWR<StudentDetail>(`/api/students/${params.studentNo}`);
  if (isLoading && !s) return <div className="loading">불러오는 중…</div>;
  if (!s) return <div className="empty">학생을 찾을 수 없습니다.</div>;

  const toMap = (m: ProgramMap): ProgramMap => ({ ...m });
  const initial: StudentFormData = {
    studentNo: s.studentNo,
    name: s.name ?? '',
    department: s.department ?? '',
    major: s.major ?? '',
    grade: s.grade ?? 1,
    gpa: s.gpa == null ? '' : String(s.gpa),
    careerGoal: s.careerGoal ?? '',
    phone: s.phone ?? '',
    email: s.email ?? '',
    certificates: s.certificates.join(', '),
    foreignLanguages: s.foreignLanguages.join(', '),
    graduationDate: s.graduationDate ?? '',
    employmentCompany: s.employmentCompany ?? '',
    swPrograms: toMap(s.swPrograms),
    bootcampPrograms: toMap(s.bootcampPrograms),
    counselings: s.counselings.map((c) => ({ counselDate: c.counselDate, counselor: c.counselor, content: c.content })),
    internships: s.internships.map((it) => ({ internshipType: it.internshipType, companyName: it.companyName, durationWeeks: it.durationWeeks == null ? '' : String(it.durationWeeks), activityDate: it.activityDate })),
  };

  return (
    <>
      <PageHeader title="학생 정보 수정" />
      <StudentForm mode="edit" initial={initial} />
    </>
  );
}
