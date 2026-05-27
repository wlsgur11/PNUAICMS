/**
 * src/lib/http.ts
 * ---------------------------------------------------------
 * API 라우트 공용 응답 헬퍼 + 에러 처리.
 *  - ok(data)            : 200 { ok:true, data }
 *  - fail(msg, status)   : { ok:false, error }
 *  - 낙관적 락 충돌은 409 로 통일 (클라이언트가 "새로고침 후 재시도" 안내)
 */
import { NextResponse } from 'next/server';

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/** 라우트 핸들러를 감싸 공통 에러를 잡는다. */
export function handle(fn: () => Promise<Response>): Promise<Response> {
  return fn().catch((e: unknown) => {
    const msg = e instanceof Error ? e.message : '알 수 없는 오류';
    // Prisma 고유 제약 위반(P2002) → 중복 메시지
    if (msg.includes('Unique constraint') || (e as { code?: string })?.code === 'P2002') {
      return fail('이미 존재하는 값입니다 (중복).', 409);
    }
    return fail(msg, 500);
  });
}

export class ConflictError extends Error {}
