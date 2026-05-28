import { signOut } from '@/auth';

/** Sidebar 에 끼워넣는 로그아웃 폼. 서버 액션이라 client 컴포넌트 안에 직접 못 둠. */
export default function LogoutForm() {
  return (
    <form
      action={async () => {
        'use server';
        await signOut({ redirectTo: '/login' });
      }}
    >
      <button type="submit" className="logout-btn">
        로그아웃
      </button>
    </form>
  );
}
