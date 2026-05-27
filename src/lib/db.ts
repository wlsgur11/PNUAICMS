/**
 * src/lib/db.ts
 * ---------------------------------------------------------
 * Prisma 클라이언트 싱글톤.
 * Next.js 개발 모드의 HMR 로 인스턴스가 계속 늘어나는 것을 막기 위해
 * globalThis 에 캐싱한다. (Prisma 공식 권장 패턴)
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
