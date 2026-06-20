/**
 * 접근 허용 판정 (도메인 + 선택적 이메일 allowlist).
 * - 기본: @pusan.ac.kr 도메인이면 허용.
 * - ALLOWED_EMAILS 환경변수(쉼표 구분)가 설정되면, 그 목록의 이메일만 허용(도메인 위에 추가 제한).
 *     예) ALLOWED_EMAILS="kim@pusan.ac.kr, lee@pusan.ac.kr"
 *   미설정이면 기존처럼 도메인만으로 허용 → 설정 전까지 동작이 바뀌지 않는다(안전 기본값).
 *
 * auth 모듈을 import 하지 않아 순환참조가 없다(src/auth.ts·lib/auth.ts 양쪽에서 사용).
 */
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
