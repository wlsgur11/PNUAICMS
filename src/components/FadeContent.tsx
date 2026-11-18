/**
 * 예전에는 아래에서 떠오르며 나타났다. 지금은 효과 없이 바로 그린다.
 * 매일 쓰는 화면이라 들어올 때마다 움직이면 숫자를 읽는 데 방해가 된다
 * (taste-skill 앱 화면 규칙, AIPMS 와 같은 결정). 부르는 곳을 다 고치지 않으려고 이름은 남긴다.
 */
export default function FadeContent({ children, className }: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  className?: string;
}) {
  return className ? <div className={className}>{children}</div> : <>{children}</>;
}
