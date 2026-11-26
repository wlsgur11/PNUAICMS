'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import PageHeader from '@/components/PageHeader';
import CountBars from '@/components/CountBars';

type Bar = { label: string; count: number };
type Student = {
  studentNo: string; nameMasked: string | null; affiliation: string | null; occupation: string | null;
  attended: boolean; level: number | null; total: number | null;
};
type Round = {
  round: number; examDate: string | null; year: number | null; registered: number; attended: number;
  avgTotal: number | null; level3Up: number; levels: Bar[]; areas: Bar[]; students: Student[];
};
type Data = { rounds: Round[]; overall: { attended: number; levels: Bar[]; level3Up: number } };

const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : '-');

/** 회차별 추이 표. 전체 탭은 전 회차, 연도 탭은 그 해 회차만 */
function TrendTable({ rounds, onPick }: { rounds: Round[]; onPick?: (year: number) => void }) {
  const maxAvg = Math.max(...rounds.map((r) => r.avgTotal ?? 0), 1);
  return (
    <div className="table-wrap" style={{ marginBottom: 28 }}>
      <table className="data-table">
        <thead><tr><th>회차</th><th>시험일</th><th>접수</th><th>응시</th><th>수준 3 이상</th><th style={{ width: '40%' }}>평균 총점 (1000점 만점)</th></tr></thead>
        <tbody>
          {rounds.map((r) => (
            <tr key={r.round} className={onPick && r.year ? 'survey-row' : undefined} onClick={() => onPick && r.year && onPick(r.year)}>
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
  );
}

/** 한 회차 결과: 수준 분포, 영역 평균, CMS 학생 목록 */
function RoundResult({ r }: { r: Round }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 className="dash-section">
        {r.round}회 <span className="muted" style={{ fontWeight: 400 }}>{r.examDate ?? ''} · 응시 {r.attended}명, 평균 {r.avgTotal ?? '-'}점</span>
      </h2>
      <div className="survey-grid" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 4 }}>수준 분포</div>
          <div className="muted" style={{ fontSize: 'calc(12px * var(--fs, 1))', marginBottom: 10 }}>응시 {r.attended}명 기준</div>
          <CountBars items={r.levels} of={r.attended} />
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 4 }}>영역별 평균 점수</div>
          <div className="muted" style={{ fontSize: 'calc(12px * var(--fs, 1))', marginBottom: 10 }}>영역마다 만점이 달라 영역끼리 높낮이를 비교하지는 않습니다</div>
          {r.areas.length ? <CountBars items={r.areas} unit="점" of={0} /> : <div className="empty">이 회차는 영역 점수가 없습니다</div>}
        </div>
      </div>
      <div className="muted" style={{ marginBottom: 8 }}>CMS 학생 {r.students.length}명</div>
      {r.students.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>이름</th><th>소속</th><th>구분</th><th>응시</th><th>수준</th><th>총점</th><th>학생 상세</th></tr></thead>
            <tbody>
              {r.students.map((s) => (
                <tr key={s.studentNo}>
                  <td>{s.nameMasked ?? '-'}</td>
                  <td>{s.affiliation ?? '-'}</td>
                  <td>{s.occupation ?? '-'}</td>
                  <td>{s.attended ? '응시' : <span className="muted">미응시</span>}</td>
                  <td>{s.level ?? '-'}</td>
                  <td>{s.total ?? '-'}</td>
                  <td><Link className="link" href={`/students/${s.studentNo}`}>상세 보기</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function TopcitPage() {
  const [tab, setTab] = useState<number | 'all'>('all');
  const { data, error } = useSWR<Data>('/api/topcit');

  const upload = <Link href="/students/topcit/import" className="btn btn-primary">엑셀 올리기</Link>;
  if (error && !data) return <div className="empty">불러오기 실패: {(error as Error).message}</div>;
  if (!data) return <div className="loading">불러오는 중…</div>;
  if (data.rounds.length === 0) {
    return (
      <>
        <PageHeader title="TOPCIT" extra={upload} />
        <div className="card empty">아직 올린 TOPCIT 결과가 없습니다. 회차별 등록접수자 엑셀을 올려 주세요.</div>
      </>
    );
  }

  const { rounds, overall } = data;
  const years = [...new Set(rounds.map((r) => r.year).filter((y): y is number => y != null))];
  const first = rounds[rounds.length - 1];
  const last = rounds[0];
  const inYear = tab === 'all' ? rounds : rounds.filter((r) => r.year === tab);

  return (
    <>
      <PageHeader
        title="TOPCIT"
        sub={`${first.round}회부터 ${last.round}회까지 ${rounds.length}회차, 평균 총점 ${first.avgTotal ?? '-'}점에서 ${last.avgTotal ?? '-'}점으로`}
        extra={upload}
      />

      <div className="survey-bar">
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }} role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'all'} className={`btn btn-sm${tab === 'all' ? ' btn-on' : ''}`} onClick={() => setTab('all')}>전체</button>
          {years.map((y) => (
            <button key={y} type="button" role="tab" aria-selected={tab === y} className={`btn btn-sm${tab === y ? ' btn-on' : ''}`} onClick={() => setTab(y)}>
              {y}년
            </button>
          ))}
        </div>
      </div>

      {tab === 'all' ? (
        <>
          <h2 className="dash-section">회차별 추이</h2>
          <p className="muted" style={{ margin: '-6px 0 12px' }}>줄을 누르면 그 해 탭으로 이동합니다.</p>
          <TrendTable rounds={rounds} onPick={setTab} />

          <h2 className="dash-section">전 회차 수준 분포</h2>
          <div className="survey-grid">
            <div className="card">
              <div className="card-title" style={{ marginBottom: 4 }}>수준 분포 (전 회차 합계)</div>
              <div className="muted" style={{ fontSize: 'calc(12px * var(--fs, 1))', marginBottom: 10 }}>
                응시 {overall.attended}명, 수준 3 이상 {overall.level3Up}명 ({pct(overall.level3Up, overall.attended)}). 같은 학생이 여러 번 보면 회차마다 따로 셉니다
              </div>
              <CountBars items={overall.levels} of={overall.attended} />
            </div>
          </div>
        </>
      ) : (
        <>
          <h2 className="dash-section">{tab}년 회차</h2>
          <TrendTable rounds={inYear} />
          {inYear.map((r) => <RoundResult key={r.round} r={r} />)}
        </>
      )}
    </>
  );
}
