import { signIn } from '@/auth';
import './login.css';

type Props = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

export const metadata = {
  title: '로그인 - 산학협력 AI 관리 시스템',
  description: '부산대학교 AI융합교육원 산학협력 AI 관리 시스템',
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

/**
 * 로그인 화면. 소개와 이용 안내는 대시보드 맨 위 '이용 안내' 로 옮겼다.
 * 로그인 전에는 기업명이나 집계 같은 실제 데이터를 보여 주지 않는다.
 */
export default async function LoginPage(props: Props) {
  const { callbackUrl = '/', error } = await props.searchParams;

  return (
    <div className="login-wrap">
      <div className="login-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-pnu.png" alt="부산대학교 AI융합교육원" className="login-logo" />
        <h1 className="login-title">산학협력 AI 관리 시스템</h1>
        <p className="login-sub">기업, 산학·인턴십 실적, 학생 이력을 한곳에서 관리합니다.</p>

        {error && <div className="login-error">로그인에 실패했습니다. 부산대 계정인지 확인해 주세요.</div>}

        <form
          action={async () => {
            'use server';
            await signIn('google', { redirectTo: callbackUrl });
          }}
        >
          <button type="submit" className="login-btn">
            <GoogleIcon />
            <span>부산대학교 Google 계정으로 로그인</span>
          </button>
        </form>

        <ul className="login-notes">
          <li><strong>@pusan.ac.kr</strong> 계정이면 학과나 소속에 관계없이 로그인됩니다.</li>
          <li>교직원 계정은 Google Workspace를 쓰지 않으면 로그인 중에 부산대학교 웹메일 화면으로 넘어갑니다. 그 화면에서 그대로 로그인하면 됩니다.</li>
          <li>처음 로그인하면 일반 계정으로 만들어집니다. 관리자에게 권한을 요청해 주세요.</li>
        </ul>
      </div>
      <p className="login-footer">© {new Date().getFullYear()} 부산대학교 AI융합교육원</p>
    </div>
  );
}
