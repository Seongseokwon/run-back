/**
 * 비밀번호 해싱·검증.
 *
 * **scrypt 를 쓰는 이유**: Node 내장이라 네이티브 의존성(bcrypt·argon2)이 없고,
 * 메모리 하드 함수라 GPU 병렬 공격에 강하다. 이 리포는 엔진의 의존성 0 을 계약으로
 * 두는 곳이라 저장소에도 빌드 툴체인이 필요한 패키지를 들이지 않는 편이 낫다.
 *
 * 저장 형식: `scrypt$N$r$p$<salt-b64>$<hash-b64>`
 * 파라미터를 값에 같이 적는다 — 나중에 비용을 올려도 **옛 해시를 그대로 검증할 수 있다.**
 * 파라미터를 코드에만 두면 올리는 순간 전원이 로그인하지 못한다.
 */

import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { promisify } from 'node:util';

// promisify 가 오버로드를 잃어버려 options 인자를 못 받는다. 직접 좁혀 준다
const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

/**
 * N=2^15 (32768). OWASP 권장 하한(N=2^14)보다 한 단계 위다.
 * maxmem 을 기본값보다 키워야 한다 — 128*N*r 이 기본 32MB 를 넘는다.
 */
const N = 32768;
const R = 8;
const P = 1;
const KEYLEN = 32;
const SALT_BYTES = 16;
const MAXMEM = 128 * N * R * 2;

/** 최소 길이. NIST SP 800-63B 는 길이를 우선하고 복잡도 규칙을 권하지 않는다 */
export const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 200;

export function validatePassword(password: string): string | null {
  if (typeof password !== 'string') return '비밀번호를 입력해 주세요.';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`;
  }
  // 해싱 비용이 입력 길이에 비례하므로 상한을 둔다 (긴 입력으로 서버를 태우는 것을 막는다)
  if (password.length > MAX_PASSWORD_LENGTH) return '비밀번호가 너무 깁니다.';
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scrypt(password.normalize('NFKC'), salt, KEYLEN, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

/**
 * 저장된 해시와 대조한다. 형식이 깨졌거나 파라미터가 이상하면 **던지지 않고 false** 다 —
 * 로그인 경로에서 예외가 새면 그 자체로 계정 존재 여부를 흘린다.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

    const n = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    if (!isPow2(n) || n > 1 << 20 || !isPositiveInt(r) || !isPositiveInt(p)) return false;

    const salt = Buffer.from(parts[4]!, 'base64');
    const expected = Buffer.from(parts[5]!, 'base64');
    if (salt.length === 0 || expected.length === 0) return false;

    const actual = await scrypt(password.normalize('NFKC'), salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: 128 * n * r * 2,
    });

    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * 존재하지 않는 계정에도 같은 시간을 쓰기 위한 더미 검증.
 *
 * 이게 없으면 응답 시간만으로 **가입된 이메일인지 아닌지가 새어 나간다.**
 * (계정 열거 공격 — 로그인 실패 메시지를 통일해도 타이밍으로 뚫린다)
 */
export async function burnPasswordTime(password: string): Promise<void> {
  await verifyPassword(password, DUMMY_HASH);
}

/** 실제 계정과 같은 파라미터여야 시간이 맞는다. 값 자체는 아무 의미 없다 */
const DUMMY_HASH = `scrypt$${N}$${R}$${P}$${Buffer.alloc(SALT_BYTES, 7).toString('base64')}$${Buffer.alloc(KEYLEN, 11).toString('base64')}`;

const isPow2 = (n: number): boolean => Number.isInteger(n) && n > 1 && (n & (n - 1)) === 0;
const isPositiveInt = (n: number): boolean => Number.isInteger(n) && n > 0 && n < 1024;
