/**
 * GET   /api/admin/users — 전체 사용자 목록 (슈퍼관리자 전용)
 * PATCH /api/admin/users — 역할/활성 변경 (슈퍼관리자 전용)
 *   body: { email, role?, active? }
 */
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, fail, handle, AppError } from '@/lib/http';

export async function GET() {
  return handle(async () => {
    await requireRole('SUPER');
    const users = await prisma.appUser.findMany({
      orderBy: [{ role: 'desc' }, { createdAt: 'asc' }],
      select: { id: true, email: true, name: true, role: true, active: true, lastLoginAt: true },
    });
    return ok(users.map((u) => ({ ...u, lastLoginAt: u.lastLoginAt?.toISOString() ?? null })));
  });
}

const patchSchema = z.object({
  email: z.string().email(),
  role: z.enum(['GENERAL', 'ADMIN', 'SUPER']).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  return handle(async () => {
    const me = await requireRole('SUPER');
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? '입력값 오류', 422);
    const { email, role, active } = parsed.data;

    // 본인 계정의 역할·활성 변경 금지 (자기 권한 회수로 인한 잠김 방지)
    if (email.toLowerCase() === me.email.toLowerCase()) {
      throw new AppError('본인 계정의 역할·활성 상태는 변경할 수 없습니다.', 400);
    }

    const target = await prisma.appUser.findUnique({ where: { email } });
    if (!target) return fail('사용자를 찾을 수 없습니다.', 404);

    const roleChanged = role !== undefined && role !== target.role;
    await prisma.appUser.update({
      where: { email },
      data: {
        ...(roleChanged ? { role, roleUpdatedBy: me.email, roleUpdatedAt: new Date() } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    });
    return ok({ email });
  });
}
