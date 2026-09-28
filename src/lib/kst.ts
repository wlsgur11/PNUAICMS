/**
 * 한국 날짜. 서버는 UTC 로 돌고 toISOString 은 시간대 설정과 상관없이 늘 UTC 라,
 * 그대로 자르면 한국 시각 오전 9시 전에는 전날 날짜가 나온다. 한국은 서머타임이 없어
 * 9시간을 더해 자르면 된다. (브라우저 쪽은 lib/client 의 localDate)
 */
export const KST_MS = 9 * 3600e3;

export const kstDate = (d = new Date()) => new Date(d.getTime() + KST_MS).toISOString().slice(0, 10);
