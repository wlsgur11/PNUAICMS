'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import PageHeader from '@/components/PageHeader';
import CountBars from '@/components/CountBars';
import SurveyAnswers from '@/components/SurveyAnswers';
import type { Answer, QuestionStat } from '@/lib/career-survey';

type Row = {
  studentNo: string; nameMasked: string | null; department: string | null; grade: string | null;
  submittedAt: string | null; inCms: boolean; answers: Answer[];
};
type Data = {
  years: { year: number; count: number }[]; year: number | null; departments: string[];
  linked: number; rows: Row[]; stats: QuestionStat[];
};

/** 자유 응답은 같은 답끼리 묶어 많은 순으로. 다 보여 주면 너무 길어 20개까지 */
function TextAnswers({ texts }: { texts: string[] }) {
  const counts = new Map<string, number>();
  for (const t of texts) counts.set(t, (counts.get(t) ?? 0) + 1);
  const list = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return (
    <ul className="survey-texts">
      {list.slice(0, 20).map(([t, n]) => <li key={t}>{t}{n > 1 && <em> {n}명</em>}</li>)}
      {list.length > 20 && <li className="muted">외 {list.length - 20}건</li>}
    </ul>
  );
}

export default function CareerSurveyPage() {
  const [year, setYear] = useState<number | null>(null);
  const [dept, setDept] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const qs = new URLSearchParams();
  if (year) qs.set('year', String(year));
  if (dept) qs.set('dept', dept);
  const { data, error } = useSWR<Data>(`/api/career-surveys?${qs}`, { keepPreviousData: true });

  const upload = <Link href="/students/career-survey/import" className="btn btn-primary">엑셀 올리기</Link>;
  if (error && !data) return <div className="empty">불러오기 실패: {(error as Error).message}</div>;
  if (!data) return <div className="loading">불러오는 중…</div>;
  if (!data.year) {
    return (
      <>
        <PageHeader title="진로조사" extra={upload} />
        <div className="card empty">아직 올린 진로조사가 없습니다. 구글폼 응답 엑셀을 올려 주세요.</div>
      </>
    );
  }

  const total = data.rows.length;
  return (
    <>
      <PageHeader
        title="진로조사"
        sub={`${data.year}년 응답 ${total}명 중 ${data.linked}명이 CMS 학생 목록에 있습니다.`}
        extra={upload}
      />

      <div className="survey-bar">
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {data.years.map((y) => (
            <button key={y.year} type="button" className={`btn btn-sm${y.year === data.year ? ' btn-on' : ''}`}
              onClick={() => { setYear(y.year); setDept(''); setOpen(null); }}>
              {y.year}년 <span className="muted">{y.count}</span>
            </button>
          ))}
        </div>
        {data.departments.length > 1 && (
          <select value={dept} onChange={(e) => { setDept(e.target.value); setOpen(null); }} aria-label="학과">
            <option value="">전체 학과</option>
            {data.departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </div>

      <h2 className="dash-section">문항별 응답</h2>
      <p className="muted" style={{ margin: '-6px 0 12px' }}>복수 응답 문항은 비율의 기준이 응답자 수라 합이 100%를 넘습니다.</p>
      <div className="survey-grid">
        {data.stats.map((s) => (
          <div key={s.q} className="card">
            <div className="card-title survey-q">{s.q}</div>
            <div className="muted" style={{ fontSize: 'calc(12px * var(--fs, 1))', marginBottom: 10 }}>응답 {s.respondents}명</div>
            {s.kind === 'choice' ? <CountBars items={s.items} of={s.respondents} /> : <TextAnswers texts={s.texts} />}
          </div>
        ))}
      </div>

      <h2 className="dash-section">응답자 {total}명</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>학번</th><th>이름</th><th>학과</th><th>학년, 졸업</th><th>응답일</th><th>CMS 학생</th></tr></thead>
          <tbody>
            {data.rows.map((r) => (
              <Fragment key={r.studentNo}>
                <tr className="survey-row" onClick={() => setOpen(open === r.studentNo ? null : r.studentNo)}
                  aria-expanded={open === r.studentNo}>
                  <td>{r.studentNo}</td>
                  <td>{r.nameMasked ?? '-'}</td>
                  <td>{r.department ?? '-'}</td>
                  <td>{r.grade ?? '-'}</td>
                  <td>{r.submittedAt ?? '-'}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {r.inCms ? <Link className="link" href={`/students/${r.studentNo}`}>상세 보기</Link> : <span className="muted">없음</span>}
                  </td>
                </tr>
                {open === r.studentNo && (
                  <tr><td colSpan={6}><SurveyAnswers answers={r.answers} /></td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

