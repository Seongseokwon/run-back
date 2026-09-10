/**
 * 로그인·로그아웃 버튼.
 *
 * 클라이언트 컴포넌트가 아니다 — form 의 action 에 Server Action 을 직접 건다.
 * 접었다 펴는 것도 `<details>` 가 맡는다. 로그인 화면 하나 때문에 번들에
 * 자바스크립트를 더할 이유가 없고, `<details>` 는 하이드레이션 전에도 열린다.
 *
 * 노란 버튼과 '카카오 로그인' 문구는 카카오 디자인 가이드가 정한 것이라
 * 우리 팔레트로 바꾸지 않는다 (globals.css 의 --color-kakao 주석 참조).
 */

import { signIn, signOut } from '@/auth';
import { Button } from '@/components/ui/button';
import { PasswordLoginForm } from './password-login-form.tsx';
import { passwordLoginAction } from './login-actions.ts';
import { DEFAULT_AFTER_LOGIN, withLoginMarker } from '@/lib/safe-redirect';

/** 이메일 로그인이 켜져 있는지. auth.ts 의 플래그와 같은 값을 본다 */
export function isPasswordLoginEnabled(): boolean {
  return process.env.AUTH_PASSWORD_LOGIN === 'true';
}

/**
 * @param redirectTo 로그인 후 돌아갈 곳. **호출부가 반드시 검증된 값을 넘긴다**
 *   (`safeCallbackUrl`). 여기서 다시 검증하지 않는 대신 기본값을 안전한 경로로 둔다.
 */
export function KakaoSignInButton({ redirectTo = DEFAULT_AFTER_LOGIN }: { redirectTo?: string }) {
  return (
    <form
      action={async () => {
        'use server';
        await signIn('kakao', { redirectTo: withLoginMarker(redirectTo, 'kakao') });
      }}
    >
      <Button type="submit" size="md" variant="kakao">
        <KakaoSymbol />
        카카오 로그인
      </Button>
    </form>
  );
}

/**
 * 이메일 + 비밀번호 로그인. 플래그가 꺼져 있으면 아무것도 그리지 않는다.
 *
 * **접어 둔 채로 시작한다.** 이건 보조 수단이고(PRD §9.3 예외), 카카오와 나란히
 * 펼쳐 두면 무엇이 주 경로인지 안 읽힌다.
 */
export function PasswordLoginSection({ redirectTo }: { redirectTo?: string }) {
  if (!isPasswordLoginEnabled()) return null;

  return (
    <details className="group">
      {/*
        ⚠️ <summary> 자체에 display:flex 를 걸지 말 것. 사파리에서 토글이 깨진다.
        레이아웃은 안쪽 <span> 이 잡는다.
      */}
      <summary className="pressable cursor-pointer list-none marker:content-none">
        <span className="flex min-h-touch items-center justify-center gap-1.5 text-body font-semibold text-ink-muted">
          이메일로 로그인
          {/* 열림/닫힘을 화살표 방향으로 알린다. 색만으로 전하지 않는다 (WCAG 1.4.1) */}
          <svg
            viewBox="0 0 20 20"
            className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>

      <div className="mt-4">
        <PasswordLoginForm action={passwordLoginAction} redirectTo={redirectTo} />
      </div>
    </details>
  );
}

export function SignOutButton() {
  return (
    <form
      action={async () => {
        'use server';
        await signOut({ redirectTo: '/' });
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
