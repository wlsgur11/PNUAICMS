'use client';

/**
 * 전역 SWR 설정 — 모든 데이터 fetch 의 캐시·재검증 정책을 한 곳에서 관리.
 *  - 같은 URL 재방문 시 캐시 즉시 반환(깜빡임 없음) + 백그라운드 재검증.
 *  - 창에 다시 포커스 들어오면 자동 갱신(다른 사용자가 바꿨을 수 있음).
 *  - dedupingInterval 동안 동일 키 중복 요청 합치기.
 */
import { SWRConfig } from 'swr';
import { api } from '@/lib/client';

export default function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: (url: string) => api(url),
        revalidateOnFocus: true,
        revalidateIfStale: true,
        dedupingInterval: 5000,
        // 오류 시 무한 재시도 방지
        shouldRetryOnError: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}
