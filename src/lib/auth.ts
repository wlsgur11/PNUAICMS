/**
 * 현재 사용자 + 역할 조회 헬퍼 (RBAC).
 * - 로그인은 NextAuth(구글 OAuth, @pusan.ac.kr)가 담당.
 * - 사용자 행 자동생성/역할 보정/조회는 Node 런타임인 이 모듈에서 한다
 *   (NextAuth 설정 src/auth.ts 에는 Prisma 를 넣지 않는다 — 엣지 미들웨어 번들 보호).
 * - 역할은 매 요청 DB 조회 → 슈퍼관리자가 권한을 바꾸면 재로그인 없이 즉시 반영.
 */
import type { Role } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { isAllowedEmail, isBootstrapSuperAdmin, roleAtLeast } from './access';
import { UnauthorizedError, ForbiddenError } from './http';

export type AppUserCtx = {
  email: string;
  name: string;
  role: Role;
};

export { isAllowedEmail };

/**
 * 인증 우회 토글. AUTH_BYPASS=true 면 SUPER 더미 사용자로 통과한다(로컬 개발·시연용).
 * 운영 배포에서는 절대 켜두지 말 것.
 * (middleware authorized 콜백은 src/auth.ts 에서 같은 플래그를 본다.)
 */
export const AUTH_BYPASS = process.env.AUTH_BYPASS === 'true';

const BYPASS_USER: AppUserCtx = {
  email: 'test@pusan.ac.kr',
  name: '테스트 계정',
  role: 'SUPER',
};

/**
 * 현재 로그인 사용자 + 역할.
 * 최초 로그인 사용자는 GENERAL 로 자동 생성하고, 부트스트랩 이메일은 SUPER 로 보정한다.
 * 정상 요청에서는 읽기 1회만(쓰기는 생성·보정 시에만).
 */
export async function getCurrentUser(): Promise<AppUserCtx | null> {
  if (AUTH_BYPASS) return BYPASS_USER;

  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || !isAllowedEmail(email)) return null;

  const name = session?.user?.name || email;
  const wantSuper = isBootstrapSuperAdmin(email);

  let user = await prisma.appUser.findUnique({ where: { email } });
  if (!user) {
    try {
      user = await prisma.appUser.create({
        data: { email, name, role: wantSuper ? 'SUPER' : 'GENERAL', lastLoginAt: new Date() },
      });
    } catch {
      // 동시 첫 로그인 레이스(unique 충돌) 대비 — 이미 생성됐으면 다시 읽는다
      user = await prisma.appUser.findUnique({ where: { email } });
    }
  } else if (wantSuper && (user.role !== 'SUPER' || !user.active)) {
    // 부트스트랩 계정이 강등/비활성돼 있으면 SUPER·활성으로 복구
    user = await prisma.appUser.update({ where: { email }, data: { role: 'SUPER', active: true } });
  }

  if (!user || !user.active) return null;
  return { email: user.email, name: user.name || email, role: user.role };
}

/** 인증 필수. 미인증/비활성이면 401. */
export async function requireUser(): Promise<AppUserCtx> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/** 역할 필수. min 미만이면 403. (Phase 2 에서 라우트에 적용) */
export async function requireRole(min: Role): Promise<AppUserCtx> {
  const user = await requireUser();
  if (!roleAtLeast(user.role, min)) throw new ForbiddenError();
  return user;
}
