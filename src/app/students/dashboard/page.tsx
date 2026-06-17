'use client';

import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import PageHeader from '@/components/PageHeader';
import type { StudentListRow } from '@/lib/student-shape';

type Stats = {
  total: number; graduated: number; highGrade: number; internParticipants: number; projectParticipants: number;
  gradeDistribution: { grade: number; count: number }[];
  recent: StudentListRow[]; needsAttention: StudentListRow[];
  departmentCounts: { label: string; count: number }[]; careerCounts: { label: string; count: number }[];
};

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div>
        <div className="muted" style={{ fontSize: 13 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 700 }}>{value}<span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>명</span></div>
      </div>
    </div>
  );
}

function Bars({ items }: { items: { label: string; count: number }[] }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((it) => (
        <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 64, fontSize: 13 }} className="muted">{it.label}</div>
          <div style={{ flex: 1, background: 'var(--slate-100)', borderRadius: 6, height: 18 }}>
            <div style={{ width: `${(it.count / max) * 100}%`, background: 'var(--indigo-500)', height: '100%', borderRadius: 6 }} />
          </div>
          <div style={{ width: 32, textAlign: 'right', fontWeight: 600 }}>{it.count}</div>
        </div>
      ))}
    </div>
  );
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const { data } = useSWR<Stats>('/api/students/stats');
  if (!data) return <div className="loading">불러오는 중…</div>;

  return (
    <>
      <PageHeader title="학생 현황" />
      <div className="tile-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        <StatCard label="전체 학생" value={data.total} icon="🎓" />
        <StatCard label="3학년 이상(재학)" value={data.highGrade} icon="📈" />
        <StatCard label="졸업생" value={data.graduated} icon="🎉" />
        <StatCard label="산학 참여" value={data.projectParticipants} icon="🔬" />
        <StatCard label="인턴십 참여" value={data.internParticipants} icon="💼" />
      </div>

      <div className="tile-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14, marginTop: 14 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}><span className="accent-bar" />학년별 현황</div>
          <Bars items={data.gradeDistribution.map((g) => ({ label: `${g.grade}학년`, count: g.count }))} />
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}><span className="accent-bar" />관리 필요 학생 <span className="muted" style={{ fontWeight: 400 }}>(3학년↑·상담 없음/실적 없음)</span></div>
          {data.needsAttention.length === 0 ? <div className="empty">없습니다.</div> : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {data.needsAttention.map((s) => (
                <span key={s.studentNo} className="tag tag-amber" style={{ cursor: 'pointer' }} onClick={() => router.push(`/students/${s.studentNo}`)}>
                  {s.nameMasked} · {s.grade ?? '-'}학년 · 상담 {s.counselCount}회
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-title" style={{ marginBottom: 10 }}><span className="accent-bar" />최근 수정 학생</div>
        {data.recent.length === 0 ? <div className="empty">없습니다.</div> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>학번</th><th>이름</th><th>학과</th><th className="center">학년</th><th>최근수정</th></tr></thead>
              <tbody>
                {data.recent.map((s) => (
                  <tr key={s.studentNo} className="row-click" onClick={() => router.push(`/students/${s.studentNo}`)}>
                    <td>{s.studentNo}</td><td>{s.nameMasked}</td><td>{s.department || '-'}</td><td className="center">{s.grade ?? '-'}</td><td>{s.updatedAt.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
