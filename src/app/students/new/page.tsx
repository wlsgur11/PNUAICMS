'use client';
import PageHeader from '@/components/PageHeader';
import FadeContent from '@/components/FadeContent';
import StudentForm from '@/components/StudentForm';

export default function NewStudentPage() {
  return (
    <>
      <PageHeader title="신규 학생 등록" />
      <FadeContent>
        <StudentForm mode="create" />
      </FadeContent>
    </>
  );
}
