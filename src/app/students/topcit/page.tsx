'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import PageHeader from '@/components/PageHeader';
import CountBars from '@/components/CountBars';

type Round = { round: number; examDate: string | null; registered: number; attended: number; avgTotal: number | null; level3Up: number };
type Row = {
  examNo: string; nameMasked: string | null; affiliation: string | null; occupation: string | null;
  attended: boolean; level: number | null; total: number | null; studentNo: string | null;
};
type Data = {
  rounds: Round[]; round: number | null; rows: Row[];
  levels: { label: string; count: number }[]; areas: { label: string; count: number }[];
};

const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : '-');

export default function TopcitPage() {
  const [round, setRound] = useState<number | null>(null);
  const { data, error } = useSWR<Data>(`/api/topcit${round ? `?round=${round}` : ''}`, { keepPreviousData: true });

  const upload = <Link href="/students/topcit/import" className="btn btn-primary">엑셀 올리기</Link>;
  if (error && !data) return <div className="empty">불러오기 실패: {(error as Error).message}</div>;
  if (!data) return <div className="loading">불러오는 중…</div>;
  if (!data.round) {
    return (
      <>
        <PageHeader title="TOPCIT" extra={upload} />
        <div className="card empty">아직 올린 TOPCIT 결과가 없습니다. 회차별 등록접수자 엑셀을 올려 주세요.</div>
      </>
    );
  }

  const cur = data.rounds.find((r) => r.round === data.round)!;
  const maxAvg = Math.max(...data.rounds.map((r) => r.avgTotal ?? 0), 1);
  return (
    <>
      <PageHeader
        title="TOPCIT"
        sub={`${cur.round}회(${cur.examDate ?? '-'}) 응시 ${cur.attended}명, 평균 ${cur.avgTotal ?? '-'}점, 수준 3 이상 ${pct(cur.level3Up, cur.attended)}`}
        extra={upload}
      />

      <h2 className="dash-section">회차별 추이</h2>
      <div className="table-wrap" style={{ marginBottom: 28 }}>
        <table className="data-table">
          <thead><tr><th>회차</th><th>시험일</th><th>접수</th><th>응시</th><th>수준 3 이상</th><th style={{ width: '40%' }}>평균 총점 (1000점 만점)</th></tr></thead>
          <tbody>
            {data.rounds.map((r) => (
              <tr key={r.round} className="survey-row" onClick={() => setRound(r.round)} aria-selected={r.round === data.round}
                style={r.round === data.round ? { background: 'var(--accent-soft)' } : undefined}>
                <td><b>{r.round}회</b></td>
                <td>{r.examDate ?? '-'}</td>
                <td>{r.registered}명</td>
                <td>{r.attended}명 <span className="muted">({pct(r.attended, r.registered)})</span></td>
                <td>{r.level3Up}명 <span className="muted">({pct(r.level3Up, r.attended)})</span></td>
                <td>
                  <div className="topcit-avg">
                    <span className="yr-bar"><span style={{ width: `${((r.avgTotal ?? 0) / maxAvg) * 100}%` }} /></span>
                    <b>{r.avgTotal ?? '-'}점</b>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="dash-section">{cur.round}회 결과</h2>
      <div className="survey-grid">
        <div className="card">
          <div className="card-title" style={{ marginBottom: 4 }}>수준 분포</div>
          <div className="muted" style={{ fontSize: 'calc(12px * var(--fs, 1))', marginBottom: 10 }}>응시 {cur.attended}명 기준</div>
          <CountBars items={data.levels} of={cur.attended} />
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 4 }}>영역별 평균 점수</div>
          <div className="muted" style={{ fontSize: 'calc(12px * var(--fs, 1))', marginBottom: 10 }}>영역마다 만점이 달라 영역끼리 높낮이를 비교하지는 않습니다</div>
          {data.areas.length ? <CountBars items={data.areas} unit="점" of={0} /> : <div className="empty">이 회차는 영역 점수가 없습니다</div>}
        </div>
      </div>

      <h2 className="dash-section">{cur.round}회 CMS 학생 {data.rows.length}명</h2>
      <p className="muted" style={{ margin: '-6px 0 12px' }}>
        이름과 연락처로 CMS 학생 목록과 이어진 응시자만 보여 줍니다. 위 추이와 결과는 접수자 {cur.registered}명 전체 기준입니다.
      </p>
      {data.rows.length > 0 && <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>이름</th><th>소속</th><th>구분</th><th>응시</th><th>수준</th><th>총점</th><th>학생 상세</th></tr></thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.examNo}>
                <td>{r.nameMasked ?? '-'}</td>
                <td>{r.affiliation ?? '-'}</td>
                <td>{r.occupation ?? '-'}</td>
                <td>{r.attended ? '응시' : <span className="muted">미응시</span>}</td>
                <td>{r.level ?? '-'}</td>
                <td>{r.total ?? '-'}</td>
                <td><Link className="link" href={`/students/${r.studentNo}`}>상세 보기</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </>
  );
}
