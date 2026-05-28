'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import PageHeader from '@/components/PageHeader';
import CompanyForm, { type CompanyFormData } from '@/components/CompanyForm';

export default function EditCompanyPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error } = useSWR<CompanyFormData>(`/api/companies/${id}`);

  return (
    <>
      <PageHeader title="기업 정보 수정" />
      {error ? <div className="card empty">{(error as Error).message}</div>
        : !data ? <div className="loading">불러오는 중…</div>
        : <CompanyForm mode="edit" initial={data} />}
    </>
  );
}
