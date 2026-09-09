'use client';

/**
 * src/lib/use-url-filters.ts
 * ---------------------------------------------------------
 * 목록 화면의 검색 필터를 URL 쿼리와 동기화한다.
 *
 * 이전에는 필터가 컴포넌트 state 에만 있어서, 목록에서 상세로 들어갔다 돌아오면
 * (뒤로가기든 '목록으로' 링크든) 컴포넌트가 새로 마운트되며 조건이 전부 풀렸다.
 * 검색을 적용할 때 URL 에 조건을 써 두면 돌아왔을 때 그 URL 에서 다시 읽어 복원된다.
 * 링크 공유나 새로고침에도 조건이 유지된다.
 *
 * empty 객체가 필터의 모양과 기본값을 정의한다. boolean 필드는 '1' 로 직렬화한다.
 */
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export type FilterShape = Record<string, string | boolean>;

export function filterParams<T extends FilterShape>(f: T): URLSearchParams {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (v === true) p.set(k, '1');
    else if (typeof v === 'string' && v.trim()) p.set(k, v.trim());
  }
  return p;
}

export function useUrlFilters<T extends FilterShape>(empty: T) {
  const sp = useSearchParams();

  // URL 쿼리 → 필터. 없는 키는 empty 의 기본값을 쓴다(예: sort=name_asc).
  const parse = (): T => {
    const out = { ...empty };
    for (const key of Object.keys(empty)) {
      const raw = sp.get(key);
      if (raw === null) continue;
      (out as FilterShape)[key] = typeof empty[key] === 'boolean' ? raw === '1' : raw;
    }
    return out;
  };

  // filters = 입력 중인 값, applied = '검색'으로 확정된 값(조회 키)
  const [filters, setFilters] = useState<T>(parse);
  const [applied, setApplied] = useState<T>(parse);

  const set = <K extends keyof T>(k: K, v: T[K]) => setFilters((p) => ({ ...p, [k]: v }));

  /** 검색 적용 + 조건을 URL 에 반영. history 항목을 늘리지 않도록 replace 를 쓴다. */
  const apply = (f: T = filters) => {
    setApplied(f);
    const qs = filterParams(f).toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  };

  const reset = () => {
    setFilters(empty);
    apply(empty);
  };

  return { filters, setFilters, set, applied, apply, reset, params: filterParams };
}
