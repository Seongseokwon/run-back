'use server';

import { AuthError } from 'next-auth';
import { signIn } from '@/auth';
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

  try {
    await signIn('password', { email, password, redirectTo: '/me' });
  } catch (error) {
    // signIn 은 성공하면 리다이렉트를 위해 던진다. 그건 통과시켜야 한다
    if (error instanceof AuthError) return { error: FAILED };
    throw error;
  }

  // 위에서 리다이렉트되므로 여기 도달하지 않는다
  return { error: null };
}
