'use client';

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

export default function AdminUsersPage() {
  const me = useMe();
  const { data, mutate, isLoading } = useSWR<Row[]>('/api/admin/users');

  const patch = async (email: string, body: { role?: Role; active?: boolean }) => {
    try {
      await api('/api/admin/users', { method: 'PATCH', body: JSON.stringify({ email, ...body }) });
      mutate();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <>
      <PageHeader title="사용자 관리" />
      <div className="card">
        <div className="muted" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
          역할을 바꾸면 즉시 반영됩니다. <strong>일반</strong>=대시보드만 / <strong>관리자</strong>=데이터 전권 / <strong>슈퍼관리자</strong>=관리자 + 사용자 관리.
          본인 계정은 변경할 수 없습니다(잠김 방지).
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>이메일</th>
                <th style={{ width: 110 }}>이름</th>
                <th style={{ width: 150 }}>역할</th>
                <th className="center" style={{ width: 96 }}>활성</th>
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
                  return (
                    <tr key={u.id} style={u.active ? undefined : { opacity: 0.5 }}>
                      <td style={{ fontWeight: 600 }}>
                        {u.email}
                        {self && <span className="muted" style={{ marginLeft: 6, fontSize: 12 }}>(나)</span>}
                      </td>
                      <td>{u.name || '-'}</td>
                      <td>
                        <select
                          value={u.role}
                          disabled={self}
                          onChange={(e) => patch(u.email, { role: e.target.value as Role })}
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                        </select>
                      </td>
                      <td className="center">
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={self}
                          onClick={() => patch(u.email, { active: !u.active })}
                        >
                          {u.active ? '활성' : '비활성'}
                        </button>
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
