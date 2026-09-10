import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_AFTER_LOGIN, safeCallbackUrl } from '../src/lib/safe-redirect.ts';

describe('로그인 후 돌아갈 경로 (오픈 리다이렉트 방어)', () => {
  test('같은 사이트 경로는 그대로 통과', () => {
    assert.equal(safeCallbackUrl('/plan/save?p=abc'), '/plan/save?p=abc');
    assert.equal(safeCallbackUrl('/today'), '/today');
  });

  test('외부 주소는 전부 막는다', () => {
    for (const bad of [
      'https://evil.example',
      'http://evil.example',
      '//evil.example',
      '/\\evil.example',
      'javascript:alert(1)',
      'evil.example',
    ]) {
      assert.equal(safeCallbackUrl(bad), DEFAULT_AFTER_LOGIN, bad);
    }
  });

  test('제어문자가 섞이면 막는다 — 브라우저마다 해석이 다르다', () => {
    // 소스에 리터럴 제어문자를 적지 않는다. 읽을 수 없는 코드가 된다
    const ctrl = (code: number): string => `/ok${String.fromCharCode(code)}evil`;
    for (const code of [0x00, 0x09, 0x0a, 0x0d, 0x1f, 0x7f]) {
      assert.equal(safeCallbackUrl(ctrl(code)), DEFAULT_AFTER_LOGIN, `charCode ${code}`);
    }
  });

  test('값이 없거나 문자열이 아니면 기본 경로', () => {
    assert.equal(safeCallbackUrl(undefined), DEFAULT_AFTER_LOGIN);
    assert.equal(safeCallbackUrl(''), DEFAULT_AFTER_LOGIN);
    assert.equal(safeCallbackUrl(123), DEFAULT_AFTER_LOGIN);
  });
});
