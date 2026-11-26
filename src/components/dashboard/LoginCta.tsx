'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import LoginButton from '@/components/LoginButton';
import { GuideBody } from './GuideBlock';

/**
 * 로그인 전 대시보드 맨 위 한 줄. 따로 있던 로그인 화면 대신 여기서 로그인한다.
 * 실적 숫자보다 눈에 띄지 않게 얇은 띠로 두고, 로그인 안내와 이용 안내는 이 띠 안에 접어 둔다
 * (2026-11-26 실장님 의견, 사용자 요청). 로그인한 뒤에는 이 띠 대신 이용 안내 띠만 보인다.
 * 로그인에 실패하면 Auth.js 가 ?error= 를 달아 이 화면으로 돌려보낸다(auth.ts pages.error).
 */
export default function LoginCta() {
  const error = useSearchParams().get('error');
  const [open, setOpen] = useState<'login' | 'guide' | null>(null);
  const toggle = (k: 'login' | 'guide') => setOpen(open === k ? null : k);

  return (
    <div className="login-cta">
      <div className="login-cta-text">
        <strong>로그인하면 기업, 실적, 학생 관리 화면이 열립니다.</strong>
        <button type="button" className="login-cta-toggle" aria-expanded={open === 'login'} onClick={() => toggle('login')}>로그인 안내</button>
        <button type="button" className="login-cta-toggle" aria-expanded={open === 'guide'} onClick={() => toggle('guide')}>이용 안내</button>
      </div>
      <div className="login-cta-action"><LoginButton /></div>
      {error && <div className="login-cta-error">로그인에 실패했습니다. 부산대 계정인지 확인해 주세요.</div>}

      {open === 'login' && (
        <ul className="login-cta-notes login-cta-panel">
          <li>지금은 집계만 보입니다. 관리 화면은 로그인하고 권한을 받은 뒤 쓸 수 있습니다.</li>
          <li><strong>@pusan.ac.kr</strong> 계정이면 학과나 소속에 관계없이 로그인됩니다. 처음 로그인하면 일반 계정이라 관리자에게 권한을 요청해 주세요.</li>
          <li>교직원 계정은 Google Workspace를 쓰지 않으면 로그인 중에 부산대학교 웹메일 화면으로 넘어갑니다. 그 화면에서 그대로 로그인하면 됩니다.</li>
        </ul>
      )}
      {open === 'guide' && <div className="login-cta-panel"><GuideBody /></div>}
    </div>
  );
}
