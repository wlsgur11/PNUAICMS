'use client';

import { useSearchParams } from 'next/navigation';
import LoginButton from '@/components/LoginButton';

/**
 * 로그인 전 대시보드 맨 위 안내. 따로 있던 로그인 화면 대신 여기서 로그인한다.
 * 로그인에 실패하면 Auth.js 가 ?error= 를 달아 이 화면으로 돌려보낸다(auth.ts pages.error).
 */
export default function LoginCta() {
  const error = useSearchParams().get('error');
  return (
    <div className="card login-cta">
      <div className="login-cta-text">
        <div className="card-title"><span className="accent-bar" />로그인하면 관리 화면이 열립니다</div>
        <ul className="login-cta-notes">
          <li>지금은 집계만 보입니다. 기업, 실적, 학생 관리는 로그인하고 권한을 받은 뒤 쓸 수 있습니다.</li>
          <li><strong>@pusan.ac.kr</strong> 계정이면 학과나 소속에 관계없이 로그인됩니다. 처음 로그인하면 일반 계정이라 관리자에게 권한을 요청해 주세요.</li>
          <li>교직원 계정은 Google Workspace를 쓰지 않으면 로그인 중에 부산대학교 웹메일 화면으로 넘어갑니다. 그 화면에서 그대로 로그인하면 됩니다.</li>
        </ul>
      </div>
      <div className="login-cta-action">
        {error && <div className="login-cta-error">로그인에 실패했습니다. 부산대 계정인지 확인해 주세요.</div>}
        <LoginButton />
      </div>
    </div>
  );
}
