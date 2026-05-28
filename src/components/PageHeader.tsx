'use client';

import { useEffect, useState } from 'react';
import { formatKDate } from '@/lib/client';

/** 페이지 상단: 제목(좌) + 오늘 날짜(우). 교수님 시안의 헤더. */
export default function PageHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  const [date, setDate] = useState('');
  useEffect(() => setDate(formatKDate()), []);
  return (
    <div className="page-head">
      <h1 className="page-title">{title}</h1>
      {right ?? <div className="page-date">{date}</div>}
    </div>
  );
}
