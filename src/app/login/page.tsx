import { signIn } from '@/auth';
import Threads from '@/components/Threads';

type Props = {
  searchParams: { callbackUrl?: string; error?: string };
};

export const metadata = {
  title: '로그인 - AI 산학협력 관리 시스템',
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

export default function LoginPage({ searchParams }: Props) {
  const callbackUrl = searchParams.callbackUrl || '/';
  const error = searchParams.error;

  return (
    <div className="login-wrap">
      <div className="login-bg">
        <Threads />
      </div>
      <div className="login-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-pnu.png" alt="부산대학교 AI융합교육원" className="login-logo" />

        <div className="login-divider" />

        <div className="login-main">
          <h1 className="login-title">AI 산학협력 관리 시스템</h1>
          <p className="login-sub">부산대학교 AI융합교육원</p>
        </div>

        {error && (
          <div className="login-error">
            로그인에 실패했습니다. 부산대 계정인지 확인해 주세요.
          </div>
        )}

        <form
          action={async () => {
            'use server';
            await signIn('google', { redirectTo: callbackUrl });
          }}
        >
          <button type="submit" className="login-btn">
            <GoogleIcon />
            <span>Google로 로그인</span>
          </button>
        </form>

        <p className="login-note">@pusan.ac.kr 계정 전용</p>

        <div className="login-hint">
          <strong>교직원 계정 안내</strong>
          부산대 포털(웹메일)에 먼저 로그인한 뒤 ‘Google로 로그인’을 누르면 한 번에 진행됩니다.
          포털 로그인 창으로 넘어가는 경우, 로그인 후 이 페이지로 돌아와 버튼을 한 번 더 눌러주세요.
        </div>
      </div>

      <div className="login-footer">© 2026 부산대학교 AI융합교육원</div>
    </div>
  );
}
