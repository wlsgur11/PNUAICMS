'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import CompanyForm, { EMPTY } from '@/components/CompanyForm';

/**
 * ?name=... 으로 기업명을 받아 미리 채운다.
 * 실적 업로드 화면의 미매칭 목록에서 "새 기업으로" 를 누르면 그 원본명이 넘어온다.
 * 엑셀에 적힌 이름 그대로 등록하면 그 실적이 저장 즉시 자동으로 붙는다.
 */
function NewCompanyForm() {
  const name = useSearchParams().get('name')?.trim();
  return <CompanyForm mode="create" initial={name ? { ...EMPTY, name } : undefined} />;
}

export default function NewCompanyPage() {
  return (
    <>
      <PageHeader title="신규 기업 등록" />
      {/* useSearchParams 는 프리렌더 때 경계가 있어야 한다 */}
      <Suspense fallback={<div className="loading">불러오는 중…</div>}>
        <NewCompanyForm />
      </Suspense>
    </>
  );
}
