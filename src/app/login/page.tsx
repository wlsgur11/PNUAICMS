import { signIn } from '@/auth';
import HeroNetwork from '@/components/HeroNetwork';
import HeroChart from '@/components/HeroChart';
import './landing.css';

type Props = {
  searchParams: { callbackUrl?: string; error?: string };
};

export const metadata = {
  title: 'AI 산학협력 관리 시스템 - 부산대학교 AI융합교육원',
  description: '기업 정보와 산학협력·인턴십 실적, 학생 이력을 한곳에서 관리합니다.',
};

/** Google 공식 G 로고 (4색). */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}

const NAV = [
  { href: '#steps', label: '이용 절차' },
  { href: '#features', label: '주요 기능' },
  { href: '#roles', label: '역할별 안내' },
];

const STEPS = [
  { no: '01', title: '구글 로그인', desc: '@pusan.ac.kr 계정으로 들어옵니다. 다른 도메인 계정은 로그인되지 않습니다.' },
  { no: '02', title: '권한 부여', desc: '처음 들어오면 일반 계정입니다. 관리자가 권한을 주면 그때부터 데이터가 열립니다.' },
  { no: '03', title: '기업과 실적', desc: '기업을 등록하고 컨택 이력을 남깁니다. 실적 엑셀을 올리면 기업에 자동으로 붙습니다.' },
  { no: '04', title: '학생과 상담', desc: '학생 이력을 등록하고, 만날 때마다 상담 내역을 그 학생 아래에 쌓습니다.' },
];

const FEATURES = [
  { title: '기업 관리', desc: '기업 정보와 실무자, 컨택 이력을 한곳에서 봅니다. 기업명만 넣으면 사업자 정보를 자동으로 조회해 채웁니다.' },
  { title: '산학·인턴십 실적', desc: '실적 엑셀을 올리면 기업에 자동으로 연결됩니다. 엑셀에 이름이 다르게 적혀 와도 별칭으로 이어 둘 수 있습니다.' },
  { title: 'SW중심대학 성과', desc: '목표 대비 달성률과 영역별 지표를 연도별로 비교합니다. 전년 대비 증감을 함께 표시합니다.' },
  { title: '학생 이력', desc: '학생 한 명의 상담 내역과 사업 참여, 인턴십, 취업 기업을 한 화면에 모읍니다. 상담은 학생 상세에서 바로 넣고 고칩니다.' },
  { title: '대시보드', desc: '목표 달성률과 파이프라인, 지역·분야 쏠림, 다음에 연락할 기업을 첫 화면에서 확인합니다.' },
  { title: '엑셀 연동', desc: '올리기와 내려받기를 모두 지원합니다. 목록에 건 필터가 그대로 적용된 엑셀을 받습니다.' },
];

const ROLES = [
  { role: '일반', work: '로그인만 됩니다. 관리자가 권한을 줄 때까지 기업·실적·학생 데이터는 보이지 않습니다.', how: '구글 로그인' },
  { role: '관리자', work: '기업과 실적, 학생 이력을 보고 등록하고 수정합니다. 엑셀을 올리고 내려받습니다.', how: '구글 로그인' },
  { role: '슈퍼관리자', work: '관리자 권한에 더해 사용자 계정의 역할을 부여하고 회수합니다.', how: '구글 로그인' },
];

const FAMILY = [
  { label: 'AI융합교육원', host: 'swedu.pusan.ac.kr', href: 'https://swedu.pusan.ac.kr' },
  { label: 'AIPMS', host: 'aipms.pusan.ac.kr', href: 'https://aipms.pusan.ac.kr' },
  { label: 'PLATO', host: 'plato.pusan.ac.kr', href: 'https://plato.pusan.ac.kr' },
  { label: '코드플레이스', host: 'code.pusan.ac.kr', href: 'https://code.pusan.ac.kr' },
  { label: 'AI역량지원시스템', host: 'swcss.pusan.ac.kr', href: 'https://swcss.pusan.ac.kr' },
  { label: '피클', host: 'pickle.pusan.ac.kr', href: 'https://pickle.pusan.ac.kr' },
  { label: '공식 유튜브', host: 'youtube.com/@pnuswedu', href: 'https://youtube.com/@pnuswedu' },
  { label: '인프런', host: 'inflearn.com/@pnuswedu', href: 'https://inflearn.com/@pnuswedu' },
];

export default function LoginPage({ searchParams }: Props) {
  const callbackUrl = searchParams.callbackUrl || '/';
  const error = searchParams.error;

  // 로그인 버튼이 히어로와 맨 아래 두 군데에 있다. 서버 액션이라 클라이언트
  // 컴포넌트로 빼면 signIn 을 못 불러서, 액션 하나를 두 폼이 같이 쓴다
  const signInAction = async () => {
    'use server';
    await signIn('google', { redirectTo: callbackUrl });
  };

  return (
    <div className="lp">
      {/* 상단 고정 네비. 앵커 링크라 자바스크립트가 필요 없다 */}
      <header className="lp-nav">
        <div className="lp-nav-in">
          <a className="lp-brand" href="#top">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-pnu.png" alt="" className="lp-brand-logo" />
            <span className="lp-brand-name">AI 산학협력 관리 시스템</span>
          </a>
          <nav className="lp-nav-links">
            {NAV.map((n) => <a key={n.href} href={n.href}>{n.label}</a>)}
          </nav>
          <a className="lp-nav-cta" href="#sign-in">로그인</a>
        </div>
      </header>

      {/* 히어로는 테마와 무관하게 늘 어둡다. 배경은 위아래 두 겹이다.
          헤드라인이 '잇는다' 라 위는 이어지는 점들, 첫 화면이 대시보드라
          아래는 지표 차트. 경계는 마스크로 흐려서 한 그림처럼 보인다 */}
      <section className="lp-hero" id="top">
        <div className="lp-hero-bg">
          <div className="lp-hero-band lp-band-top"><HeroNetwork /></div>
          <div className="lp-hero-band lp-band-bottom"><HeroChart /></div>
        </div>
        <div className="lp-hero-in">
          <div className="lp-hero-copy">
            <p className="lp-eyebrow">부산대학교 AI융합교육원</p>
            <h1 className="lp-h1">기업을 찾고, 실적을 쌓고,<br />학생을 잇는다</h1>
            <p className="lp-lead">
              산학협력 기업 정보부터 실적 집계, 학생 상담 이력까지 한 화면에서 이어집니다.
              엑셀로 흩어져 있던 기록을 한곳에 모아 두고, 목표 대비 어디까지 왔는지 바로 확인합니다.
            </p>
          </div>

          <div className="lp-signin" id="sign-in">
            <h2 className="lp-signin-title">로그인</h2>
            <p className="lp-signin-sub">부산대학교 Google 계정으로 로그인</p>

            {error && (
              <div className="lp-error">로그인에 실패했습니다. 부산대 계정인지 확인해 주세요.</div>
            )}

            <form action={signInAction}>
              <button type="submit" className="lp-google">
                <GoogleIcon />
                <span>부산대학교 Google 계정으로 로그인</span>
              </button>
            </form>

            <ul className="lp-notes">
              <li><strong>@pusan.ac.kr</strong> 계정만 사용할 수 있습니다.</li>
              <li>교직원 계정은 Google Workspace를 쓰지 않으면 로그인 중에 부산대학교 웹메일 화면으로 넘어갑니다. 그 화면에서 그대로 로그인하면 됩니다.</li>
              <li>처음 로그인하면 일반 계정으로 만들어집니다. 관리자에게 권한을 요청해 주세요.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="lp-sec" id="steps">
        <div className="lp-sec-in">
          <h2 className="lp-h2">이용 절차</h2>
          <p className="lp-sec-lead">네 단계면 됩니다. 학교 계정으로 들어와 권한을 한 번 받으면 그다음부터는 반복하지 않습니다.</p>
          <ol className="lp-steps">
            {STEPS.map((s) => (
              <li key={s.no}>
                <span className="lp-step-no">{s.no}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="lp-sec" id="features">
        <div className="lp-sec-in">
          <h2 className="lp-h2">주요 기능</h2>
          <p className="lp-sec-lead">기업, 실적, 학생을 따로 관리하지 않고 같은 시스템에서 이어 둡니다.</p>
          <dl className="lp-features">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <dt>{f.title}</dt>
                <dd>{f.desc}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="lp-sec" id="roles">
        <div className="lp-sec-in">
          <h2 className="lp-h2">역할별 안내</h2>
          <p className="lp-sec-lead">권한은 관리자가 계정마다 지정합니다. 처음 로그인한 계정은 모두 일반으로 시작합니다.</p>
          <div className="lp-table-wrap">
            <table className="lp-table">
              <thead>
                <tr><th>역할</th><th>하는 일</th><th>접속 방법</th></tr>
              </thead>
              <tbody>
                {ROLES.map((r) => (
                  <tr key={r.role}>
                    <th scope="row">{r.role}</th>
                    <td>{r.work}</td>
                    <td className="lp-how">{r.how}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="lp-family">
        <div className="lp-sec-in">
          <h2 className="lp-h3">패밀리 사이트</h2>
          <ul className="lp-family-grid">
            {FAMILY.map((f) => (
              <li key={f.href}>
                <a href={f.href} target="_blank" rel="noreferrer noopener">
                  <span className="lp-family-bar" />
                  <strong>{f.label}</strong>
                  <span className="lp-family-host">{f.host}</span>
                  <span className="lp-family-go">바로가기 →</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="lp-closing">
        <div className="lp-sec-in">
          <h2 className="lp-h2">부산대학교 AI융합교육원 구성원이면 지금 들어올 수 있습니다</h2>
          <p className="lp-sec-lead">권한이 없으면 로그인만 되고 데이터는 보이지 않습니다. 관리자에게 알려 주세요.</p>
          <form action={signInAction}>
            {/* 여기엔 구글 4색 로고를 안 쓴다. 파란 버튼 위에 올리면 구글 브랜드
                가이드에도 어긋나고 색이 뭉개져 보인다. 실제 구글 버튼은 히어로에 있다 */}
            <button type="submit" className="lp-google lp-google-lg">로그인하러 가기</button>
          </form>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-sec-in lp-footer-in">
          <span>부산대학교 AI융합교육원</span>
          <span className="lp-footer-copy">© {new Date().getFullYear()} Pusan National University</span>
        </div>
      </footer>
    </div>
  );
}
