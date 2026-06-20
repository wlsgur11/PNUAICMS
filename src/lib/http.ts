/**
 * src/lib/http.ts
 * ---------------------------------------------------------
 * API 라우트 공용 응답 헬퍼 + 에러 처리.
 *  - ok(data)            : 200 { ok:true, data }
 *  - fail(msg, status)   : { ok:false, error }
 *  - handle()            : 사용자에게 보여도 되는 에러(AppError/Unauthorized/Conflict)만
 *                          메시지를 노출하고, 예기치 못한 오류는 서버 로그로만 남기고
 *                          클라이언트에는 일반 메시지를 준다(내부 정보 비노출).
 */
import { NextResponse } from 'next/server';

/** 업로드 허용 최대 크기(바이트). 메모리 고갈·압축폭탄 방지용. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

/** 사용자에게 그대로 보여줘도 되는 에러(입력 검증·파싱 안내 등). */
export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

/** 인증 필요(401). */
export class UnauthorizedError extends Error {
  constructor(message = '로그인이 필요합니다.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/** 낙관적 락 등 충돌(409). */
export class ConflictError extends Error {}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/** 라우트 핸들러를 감싸 공통 에러를 잡는다. */
export function handle(fn: () => Promise<Response>): Promise<Response> {
  return fn().catch((e: unknown) => {
    // 사용자에게 보여도 되는 에러 → 의도한 메시지·상태 그대로
    if (e instanceof UnauthorizedError) return fail(e.message, 401);
    if (e instanceof AppError) return fail(e.message, e.status);
    if (e instanceof ConflictError) return fail(e.message || '충돌이 발생했습니다.', 409);

    const code = (e as { code?: string })?.code;
    const msg = e instanceof Error ? e.message : '';
    // Prisma 고유 제약 위반(P2002) → 중복 메시지
    if (msg.includes('Unique constraint') || code === 'P2002') {
      return fail('이미 존재하는 값입니다 (중복).', 409);
    }
    // 낙관적 락 충돌 센티넬
    if (msg === '__CONFLICT__') {
      return fail('다른 사용자가 먼저 수정했습니다. 새로고침 후 다시 시도해 주세요.', 409);
    }
    // 예기치 못한 오류: 내부 메시지는 숨기고 서버 로그로만 남긴다.
    console.error('[API 500]', e);
    return fail('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', 500);
  });
}
