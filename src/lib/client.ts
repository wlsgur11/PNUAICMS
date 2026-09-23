'use client';

/**
 * src/lib/client.ts
 * ---------------------------------------------------------
 * 클라이언트 컴포넌트용 fetch 래퍼.
 * 서버의 { ok, data | error } 규약을 풀어 data 를 반환하거나 throw 한다.
 */
export async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    cache: 'no-store',
  });
  let json: { ok?: boolean; data?: T; error?: string } = {};
  try {
    json = await res.json();
  } catch {
    throw new Error(`서버 응답 오류 (HTTP ${res.status})`);
  }
  if (!res.ok || !json.ok) {
    const err = new Error(json.error || `요청 실패 (HTTP ${res.status})`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return json.data as T;
}

// toISOString 은 UTC 라 한국 시각 오전 9시 전에는 어제 날짜가 나온다
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function formatKDate(d = new Date()): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
}
