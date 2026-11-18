'use client';

import { useEffect, useState } from 'react';
import { formatKDate } from '@/lib/client';

/**
 * 페이지 상단: 제목(좌) + 오늘 날짜(우). 교수님 시안의 헤더.
 * right 는 날짜를 대체하고, extra 는 날짜를 남긴 채 그 앞에 끼운다.
 */
export default function PageHeader({ title, sub, right, extra }: {
  title: string; sub?: React.ReactNode; right?: React.ReactNode; extra?: React.ReactNode;
}) {
  const [date, setDate] = useState('');
  useEffect(() => setDate(formatKDate()), []);
  return (
    <div className="page-head">
      <div style={{ minWidth: 0 }}>
        <h1 className="page-title">{title}</h1>
        {/* 화면이 먼저 답하는 한 줄. 데이터에서 계산한 문장만 넣는다 */}
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {right ?? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {extra}
          <div className="page-date">{date}</div>
        </div>
      )}
    </div>
  );
}
