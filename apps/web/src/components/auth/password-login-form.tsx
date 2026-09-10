'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';

export type LoginState = { error: string | null };

/**
 * 이메일 + 비밀번호 로그인 폼.
 *
 * 에러 문구는 **한 가지뿐**이다. '없는 계정'과 '틀린 비밀번호'를 나눠 보여 주면
 * 화면만 보고도 가입 여부를 알아낼 수 있다 (계정 열거). 서버도 같은 이유로
 * 실패 이유를 구분해서 돌려주지 않는다.
 */
export function PasswordLoginForm({
  action,
  redirectTo,
}: {
  action: (state: LoginState, formData: FormData) => Promise<LoginState>;
  /** 로그인 후 돌아갈 곳. 서버 액션이 formData 로 받는다 */
  redirectTo?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="space-y-4">
      {/* 서버 액션은 인자를 못 받으므로 폼에 실어 보낸다. 서버가 다시 검증한다 */}
      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
      <Field label="이메일">
        {(id) => (
          <TextInput
            id={id}
            name="email"
            type="email"
            autoComplete="username"
            required
            placeholder="me@example.com"
          />
        )}
      </Field>

      <Field label="비밀번호">
        {(id) => (
          <TextInput
            id={id}
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        )}
      </Field>

      {/*
        role="alert" 이라 스크린리더가 바뀐 걸 읽어 준다.
        색만으로 오류를 전하지 않는다 — 문장이 함께 간다 (WCAG 1.4.1)
      */}
      {state.error ? (
        <p role="alert" className="text-body text-verdict-unrealistic">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="md" variant="outline" disabled={pending}>
        {pending ? '확인 중…' : '로그인'}
      </Button>
    </form>
  );
}
