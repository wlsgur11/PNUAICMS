'use client';

import { useState } from 'react';
import useSWR from 'swr';
import PageHeader from '@/components/PageHeader';
import { api } from '@/lib/client';
import { useMe } from '@/components/MeProvider';

type Role = 'GENERAL' | 'ADMIN' | 'SUPER';
type Row = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  active: boolean;
  lastLoginAt: string | null;
};

const ROLES: Role[] = ['GENERAL', 'ADMIN', 'SUPER'];
const ROLE_LABEL: Record<Role, string> = { GENERAL: '일반', ADMIN: '관리자', SUPER: '슈퍼관리자' };

type SaveField = 'role' | 'active';
type SaveState = { state: 'saving' | 'saved' | 'error'; field: SaveField };

/** 저장 진행/완료 표시 (변경한 컨트롤 옆에만 노출). */
function SaveTag({ st, field }: { st?: SaveState; field: SaveField }) {
  if (!st || st.field !== field) return null;
  const text = st.state === 'saving' ? '저장 중…' : st.state === 'saved' ? '저장됨 ✓' : '실패';
  return <span className={`save-tag ${st.state}`}>{text}</span>;
}

export default function AdminUsersPage() {
  const me = useMe();
  const { data, mutate, isLoading } = useSWR<Row[]>('/api/admin/users');
  const [status, setStatus] = useState<Record<string, SaveState | undefined>>({});

  // 낙관적 업데이트: 화면을 먼저 바꾸고 저장 → 끝나면 "저장됨 ✓", 실패 시 자동 롤백.
  const runPatch = async (u: Row, body: { role?: Role; active?: boolean }, field: SaveField) => {
    const current = data ?? [];
    const optimistic = current.map((r) => (r.email === u.email ? { ...r, ...body } : r));
    setStatus((s) => ({ ...s, [u.email]: { state: 'saving', field } }));
    try {
      await mutate(
        async () => {
          await api('/api/admin/users', { method: 'PATCH', body: JSON.stringify({ email: u.email, ...body }) });
          return optimistic;
        },
        { optimisticData: optimistic, rollbackOnError: true, revalidate: false },
      );
      setStatus((s) => ({ ...s, [u.email]: { state: 'saved', field } }));
      // 잠시 후 "저장됨 ✓" 자동 제거 (그 사이 다른 저장이 시작됐으면 건드리지 않음)
      setTimeout(() => {
        setStatus((s) => (s[u.email]?.state === 'saved' ? { ...s, [u.email]: undefined } : s));
      }, 1600);
    } catch (e) {
      setStatus((s) => ({ ...s, [u.email]: { state: 'error', field } }));
      alert((e as Error).message);
    }
  };

  return (
    <>
      <PageHeader title="사용자 관리" />
      <div className="card">
        <div className="muted" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
          역할을 바꾸거나 스위치를 누르면 <strong>즉시 저장</strong>됩니다. <strong>일반</strong>=대시보드만 / <strong>관리자</strong>=데이터 전권 / <strong>슈퍼관리자</strong>=관리자 + 사용자 관리.
          접근 스위치를 <strong>끄면(차단)</strong> 로그인해도 들어올 수 없습니다. 본인 계정은 변경할 수 없습니다(잠김 방지).
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>이메일</th>
                <th style={{ width: 110 }}>이름</th>
                <th style={{ width: 210 }}>역할</th>
                <th style={{ width: 170 }}>접근</th>
                <th style={{ width: 120 }}>최근 로그인</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && !data ? (
                <tr><td colSpan={5} className="loading">불러오는 중…</td></tr>
              ) : !data || data.length === 0 ? (
                <tr><td colSpan={5} className="empty">사용자가 없습니다.</td></tr>
              ) : (
                data.map((u) => {
                  const self = me?.email?.toLowerCase() === u.email.toLowerCase();
                  const st = status[u.email];
                  const saving = st?.state === 'saving';
                  return (
                    <tr key={u.id} className={u.active ? undefined : 'row-inactive'}>
                      <td style={{ fontWeight: 600 }}>
                        {u.email}
                        {self && <span className="muted" style={{ marginLeft: 6, fontSize: 12 }}>(나)</span>}
                      </td>
                      <td>{u.name || '-'}</td>
                      <td>
                        <select
                          value={u.role}
                          disabled={self || saving}
                          onChange={(e) => runPatch(u, { role: e.target.value as Role }, 'role')}
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                        </select>
                        <SaveTag st={st} field="role" />
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`switch${u.active ? ' on' : ''}`}
                          role="switch"
                          aria-checked={u.active}
                          disabled={self || saving}
                          title={self ? '본인 계정은 변경할 수 없습니다' : u.active ? '클릭하면 차단됩니다' : '클릭하면 활성화됩니다'}
                          onClick={() => runPatch(u, { active: !u.active }, 'active')}
                        >
                          <span className="switch-track"><span className="switch-knob" /></span>
                          <span className="switch-label">{u.active ? '활성' : '차단'}</span>
                        </button>
                        <SaveTag st={st} field="active" />
                      </td>
                      <td className="muted">{u.lastLoginAt ? u.lastLoginAt.slice(0, 10) : '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
