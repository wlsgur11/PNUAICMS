/**
 * 접근 허용 판정 (도메인 + 선택적 이메일 allowlist).
 * - 기본: @pusan.ac.kr 도메인이면 허용.
 * - ALLOWED_EMAILS 환경변수(쉼표 구분)가 설정되면, 그 목록의 이메일만 허용(도메인 위에 추가 제한).
 *     예) ALLOWED_EMAILS="kim@pusan.ac.kr, lee@pusan.ac.kr"
 *   미설정이면 기존처럼 도메인만으로 허용 → 설정 전까지 동작이 바뀌지 않는다(안전 기본값).
 *
 * auth 모듈을 import 하지 않아 순환참조가 없다(src/auth.ts·lib/auth.ts 양쪽에서 사용).
 */
import type { Role } from '@prisma/client';

const ALLOWED_DOMAINS = ['pusan.ac.kr'];

const ALLOWLIST = (process.env.ALLOWED_EMAILS ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  const domain = e.split('@')[1];
  if (!domain || !ALLOWED_DOMAINS.includes(domain)) return false;
  if (ALLOWLIST.length > 0 && !ALLOWLIST.includes(e)) return false;
  return true;
}

/** 부트스트랩 슈퍼관리자 이메일(쉼표 구분). 로그인 시 항상 SUPER 로 보정된다. */
const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function isBootstrapSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

/** 역할 위계: GENERAL(0) < ADMIN(1) < SUPER(2). role 이 min 이상이면 true. */
const ROLE_RANK: Record<Role, number> = { GENERAL: 0, ADMIN: 1, SUPER: 2 };
export function roleAtLeast(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}
