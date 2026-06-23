/**
 * 접근/역할 판정 헬퍼.
 * - 로그인 자체는 @pusan.ac.kr 도메인이면 누구나 허용(가입 후 일반 GENERAL).
 *   인가(데이터 접근)는 역할로 제어한다(requireRole). 과거 ALLOWED_EMAILS 화이트리스트는 은퇴.
 * - auth 모듈을 import 하지 않아 순환참조가 없다(src/auth.ts·lib/auth.ts 양쪽에서 사용).
 */
import type { Role } from '@prisma/client';

const ALLOWED_DOMAINS = ['pusan.ac.kr'];

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const domain = email.toLowerCase().split('@')[1];
  return !!domain && ALLOWED_DOMAINS.includes(domain);
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
