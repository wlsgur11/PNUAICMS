/**
 * src/lib/contact-sync.ts
 * ---------------------------------------------------------
 * 실무자의 '최근컨택일'(lastContactAt)을 그 실무자에게 달린 컨택이력에서 다시 계산한다.
 *
 * 예전에는 이력을 추가할 때 그 이력의 날짜로 무조건 덮어썼다. 그래서
 *  - 과거 날짜 이력을 뒤늦게 입력하면 최근컨택일이 과거로 후퇴했고
 *  - 이력을 고치거나 지워도 최근컨택일은 옛 값 그대로였다.
 * 남은 이력 중 가장 최근 날짜로 다시 계산하면 추가, 수정, 삭제 세 경우가 모두 맞는다.
 *
 * 컨택일자는 'yyyy-MM-dd' 고정폭 문자열이라 사전순 정렬이 곧 날짜순 정렬이다.
 */
import type { Prisma } from '@prisma/client';

/** prisma 본체와 트랜잭션 클라이언트 둘 다 받는다. */
type Db = Prisma.TransactionClient;

export async function syncLastContact(db: Db, personId: string | null | undefined): Promise<void> {
  if (!personId) return;
  const latest = await db.contactHistory.findFirst({
    where: { personId },
    orderBy: { contactDate: 'desc' },
    select: { contactDate: true },
  });
  // updateMany 라 실무자가 이미 삭제됐어도 예외가 나지 않는다.
  await db.contactPerson.updateMany({
    where: { id: personId },
    data: { lastContactAt: latest?.contactDate ?? null },
  });
}
