'use client';

import Link from 'next/link';
import type { DistributionItem } from '@/lib/dashboard-shape';

/** Collaboration boolean 필드명과 목록 화면 쿼리 키가 같아 라벨로 역참조한다 */
const QUERY_KEY: Record<string, string> = {
  '인턴십': 'internship',
  '산학프로젝트': 'industryProject',
  '교과과정혁신위원회': 'curriculumCommittee',
  '특강연계': 'guestLecture',
  '채용연계': 'employment',
  '표준현장실습기관 등록': 'fieldTrainingOrg',
  '해외교육': 'overseasEducation',
  '가치확산': 'valueSpread',
  '창업': 'startup',
  '기타': 'etc',
};

/**
 * 협력 항목별 기업 수. 파이프라인이 '진행 단계' 축이라면 이쪽은 '협력 내용' 축이다.
 * 지역 분포도 같은 카드에 둔다. 기업 포트폴리오를 한 곳에서 보게 하려는 것이고,
 * 지역은 조정 대상이 아니라 배경 정보라 쏠림 진단에서 빼 왔다.
 */
export default function CollabBlock({ items, region }: {
  items: { key: string; count: number }[];
  region: DistributionItem[];
}) {
  const max = Math.max(1, ...items.map((x) => x.count));
  const regionTotal = region.reduce((a, x) => a + x.count, 0);

  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>협력 내용과 소재지</h2>
        <p>기업별 협력 항목의 분포입니다. 항목을 누르시면 해당 조건의 기업 목록으로 이동합니다.</p>
      </div>

      {items.length === 0 ? (
        <div className="empty" style={{ fontSize: 13 }}>협력 항목이 표시된 기업이 없습니다.</div>
      ) : (
        items.map((x) => {
          const q = QUERY_KEY[x.key];
          const body = (
            <>
              <span className="name">{x.key}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'flex-end' }}>
                <span style={{ flex: '0 1 110px', height: 4, background: 'var(--slate-100)', borderRadius: 2 }}>
                  <span style={{ display: 'block', width: `${(x.count / max) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
                </span>
                <span className="num" style={{ minWidth: 28, textAlign: 'right' }}>{x.count}</span>
              </span>
            </>
          );
          return q
            ? <Link key={x.key} href={`/companies?${q}=1`} className="dash-list-row">{body}</Link>
            : <div key={x.key} className="dash-list-row">{body}</div>;
        })
      )}

      {regionTotal > 0 && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--slate-100)' }}>
          <div className="dash-metric-label" style={{ marginBottom: 10 }}>소재지</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
            {region.map((r) => (
              <Link key={r.key} href={`/companies?region=${encodeURIComponent(r.key)}`}
                    style={{ fontSize: 12, color: 'var(--text-2)', textDecoration: 'none' }}>
                {r.key} <span className="dash-num" style={{ color: 'var(--text-1)', fontWeight: 500 }}>{r.count}</span>
                <span style={{ color: 'var(--text-3)' }}> · {((r.count / regionTotal) * 100).toFixed(0)}%</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
