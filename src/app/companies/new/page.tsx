'use client';

import PageHeader from '@/components/PageHeader';
import CompanyForm from '@/components/CompanyForm';

export default function NewCompanyPage() {
  return (
    <>
      <PageHeader title="신규 기업 등록" />
      <CompanyForm mode="create" />
    </>
  );
}
