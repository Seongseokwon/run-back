/**
 * 계정 생성 CLI.
 *
 *   pnpm --filter @runback/db user:create -- me@example.com '비밀번호10자이상'
 *
 * 공개 가입 화면을 만들지 않고 CLI 로 둔 이유: 열린 가입 엔드포인트는 스팸가입 대응
 * (레이트 리밋·캡차)이 따라와야 한다. PRD §9.3 이 비밀번호 방식을 피하려 한 이유 중 하나가
 * 그거였다. 지금은 계정이 몇 개 필요하지 않으므로 굳이 열지 않는다.
 *
 * ⚠️ 비밀번호가 셸 히스토리에 남는다. 실사용 계정을 만들 거라면 만든 뒤
 * 히스토리를 지우거나, 공개 가입 화면을 제대로 만들 것.
 */

import { registerPasswordUser } from './password-auth.ts';
import { MIN_PASSWORD_LENGTH } from './password.ts';
import { prisma } from './client.ts';

// pnpm 이 `--` 를 인자로 그대로 넘겨준다. 있으면 걷어낸다
const argv = process.argv.slice(2).filter((a) => a !== '--');
const [email, password, nickname] = argv;

if (!email || !password) {
  console.error('사용법: user:create -- <이메일> <비밀번호> [닉네임]');
  console.error(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상.`);
  process.exit(1);
}

const result = await registerPasswordUser({ email, password, ...(nickname ? { nickname } : {}) });

if (result.ok) {
  console.log('계정 생성:', result.user.id, nickname ? `(${nickname})` : '');
  console.log('이메일은 평문으로 저장되지 않습니다 — 해시로만 들어갑니다.');
} else {
  const message = {
    'invalid-email': '이메일 형식이 올바르지 않습니다.',
    'weak-password': `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`,
    taken: '이미 사용 중인 이메일입니다.',
  }[result.reason];
  console.error('실패:', message);
  process.exitCode = 1;
}

await prisma.$disconnect();
