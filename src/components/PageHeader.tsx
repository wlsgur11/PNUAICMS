'use client';

import { useEffect, useState } from 'react';
import { formatKDate } from '@/lib/client';

/**
 * 페이지 상단: 제목(좌) + 오늘 날짜(우). 교수님 시안의 헤더.
 * right 는 날짜를 대체하고, extra 는 날짜를 남긴 채 그 앞에 끼운다.
 */
export default function PageHeader({ title, right, extra }: {
  title: string; right?: React.ReactNode; extra?: React.ReactNode;
}) {
  const [date, setDate] = useState('');
  useEffect(() => setDate(formatKDate()), []);
  return (
    <div className="page-head">
      <h1 className="page-title">{title}</h1>
      {right ?? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {extra}
          <div className="page-date">{date}</div>
        </div>
      )}
    </div>
  );
}
