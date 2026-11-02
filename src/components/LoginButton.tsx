'use client';

import { useSearchParams } from 'next/navigation';
import { signInWithGoogle } from '@/lib/auth-actions';

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
 * 구글 로그인 버튼. 로그인이 필요한 화면에서 넘어오면 미들웨어가 ?callbackUrl= 을 달아 주므로
 * 로그인 뒤 그 화면으로 돌아간다.
 */
export default function LoginButton({ label = '부산대학교 Google 계정으로 로그인' }: { label?: string }) {
  const callbackUrl = useSearchParams().get('callbackUrl') ?? '/';
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <button type="submit" className="login-btn">
        <GoogleIcon />
        <span>{label}</span>
      </button>
    </form>
  );
}
