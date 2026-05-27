'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import CompanyForm, { type CompanyFormData } from '@/components/CompanyForm';
import { api } from '@/lib/client';

export default function EditCompanyPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<CompanyFormData | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api<CompanyFormData>(`/api/companies/${id}`).then(setData).catch((e) => setErr(e.message));
  }, [id]);

  return (
    <>
      <PageHeader title="기업 정보 수정" />
      {err ? <div className="card empty">{err}</div>
        : !data ? <div className="loading">불러오는 중…</div>
        : <CompanyForm mode="edit" initial={data} />}
    </>
  );
}
