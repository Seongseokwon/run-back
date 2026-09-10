'use server';

import { AuthError } from 'next-auth';
import { signIn } from '@/auth';
import { safeCallbackUrl, withLoginMarker } from '@/lib/safe-redirect.ts';
import type { LoginState } from './password-login-form.tsx';

/** 실패 문구는 하나뿐이다 — 이유를 나누면 가입 여부가 새어 나간다 */
const FAILED = '이메일 또는 비밀번호가 올바르지 않습니다.';

export async function passwordLoginAction(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get('email');
  const password = formData.get('password');

  if (typeof email !== 'string' || typeof password !== 'string') {
    return { error: FAILED };
  }

  // 폼에서 온 값이라 반드시 다시 검증한다 — 사용자가 고칠 수 있는 입력이다
  const redirectTo = safeCallbackUrl(formData.get('redirectTo'));

  try {
    await signIn('password', { email, password, redirectTo: withLoginMarker(redirectTo, 'password') });
  } catch (error) {
    // signIn 은 성공하면 리다이렉트를 위해 던진다. 그건 통과시켜야 한다
    if (error instanceof AuthError) return { error: FAILED };
    throw error;
  }

  // 위에서 리다이렉트되므로 여기 도달하지 않는다
  return { error: null };
}
