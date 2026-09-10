/**
 * 로그인·로그아웃 버튼.
 *
 * 클라이언트 컴포넌트가 아니다 — form 의 action 에 Server Action 을 직접 건다.
 * 로그인 버튼 하나 때문에 번들에 자바스크립트를 더할 이유가 없다.
 *
 * 노란 버튼과 '카카오 로그인' 문구는 카카오 디자인 가이드가 정한 것이라
 * 우리 팔레트로 바꾸지 않는다 (globals.css 의 --color-kakao 주석 참조).
 */

import { signIn, signOut } from '@/auth';
import { Button } from '@/components/ui/button';
import { PasswordLoginForm } from './password-login-form.tsx';
import { passwordLoginAction } from './login-actions.ts';

/** 이메일 로그인이 켜져 있는지. auth.ts 의 플래그와 같은 값을 본다 */
export function isPasswordLoginEnabled(): boolean {
  return process.env.AUTH_PASSWORD_LOGIN === 'true';
}

/** 이메일 + 비밀번호 로그인. 플래그가 꺼져 있으면 아무것도 그리지 않는다 */
export function PasswordLoginSection() {
  if (!isPasswordLoginEnabled()) return null;
  return <PasswordLoginForm action={passwordLoginAction} />;
}

/** @param redirectTo 로그인 후 돌아갈 곳. 저장 흐름에서는 원래 보던 플랜으로 되돌린다 */
export function KakaoSignInButton({ redirectTo = '/me' }: { redirectTo?: string }) {
  return (
    <form
      action={async () => {
        'use server';
        await signIn('kakao', { redirectTo });
      }}
    >
      <Button type="submit" size="md" variant="kakao">
        <KakaoSymbol />
        카카오 로그인
      </Button>
    </form>
  );
}

export function SignOutButton() {
  return (
    <form
      action={async () => {
        'use server';
        await signOut({ redirectTo: '/me' });
      }}
    >
      <Button type="submit" size="md" variant="ghost">
        로그아웃
      </Button>
    </form>
  );
}

/** 카카오 말풍선 심벌 */
function KakaoSymbol() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
      <path d="M12 3C6.9 3 2.8 6.3 2.8 10.4c0 2.6 1.7 4.9 4.3 6.2-.2.7-.7 2.5-.8 2.9-.1.5.2.5.4.4.2-.1 2.6-1.8 3.7-2.5.5.1 1.1.1 1.6.1 5.1 0 9.2-3.3 9.2-7.4S17.1 3 12 3z" />
    </svg>
  );
}
