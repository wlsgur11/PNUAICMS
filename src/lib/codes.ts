/**
 * src/lib/codes.ts
 * ---------------------------------------------------------
 * 사람이 읽는 코드(C-001 / P-0001 / H-0001) 채번.
 * Counter 테이블을 트랜잭션 내에서 원자적으로 증가시켜 충돌을 막는다.
 * (v1 의 _시스템 카운터 시트를 대체)
 */
import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

const CONFIG: Record<string, { prefix: string; width: number }> = {
  company: { prefix: 'C', width: 3 },
  person: { prefix: 'P', width: 4 },
  history: { prefix: 'H', width: 4 },
};

/** 트랜잭션 클라이언트로 다음 코드를 발급한다. */
export async function nextCode(tx: Tx, key: 'company' | 'person' | 'history'): Promise<string> {
  const cfg = CONFIG[key];
  const counter = await tx.counter.upsert({
    where: { key },
    update: { value: { increment: 1 } },
    create: { key, value: 1 },
  });
  return `${cfg.prefix}-${String(counter.value).padStart(cfg.width, '0')}`;
}
