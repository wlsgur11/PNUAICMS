/**
 * src/lib/swcu-format.ts
 * ---------------------------------------------------------
 * SW중심대학 지표 값의 표시 형식. 지표 상세, 업로드 미리보기, 대시보드가 함께 쓴다.
 */

/**
 * 지표 값 한 개를 사람이 읽는 문자열로.
 *
 * 단위가 '%' 인 지표는 DB 에 0.018181818... 같은 비율로 들어 있다.
 * 그대로 찍으면 '0.01818181818181818 / 0.05%' 가 화면에 나온다. 100 을 곱해
 * 퍼센트로 바꾸고 자리를 끊는다.
 *
 * 그 밖의 단위(명, 건, 점)는 소수 둘째 자리까지만 남긴다. 나눗셈으로 만들어진
 * 값이 섞여 있어 반올림하지 않으면 같은 문제가 난다.
 */
export function formatSwcuValue(n: number | null, unit: string | null, digits = 1): string {
  if (n == null) return '-';
  if (unit === '%') return `${(n * 100).toFixed(digits)}%`;
  return String(Math.round(n * 100) / 100);
}
