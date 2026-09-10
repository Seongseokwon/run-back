/**
 * 법적 고지 점검. `npm run legal`
 *
 * 이 리포에는 "코드가 방침보다 앞서 나가면 그게 곧 위반"이라는 규칙이 있는데
 * (legal-content.ts 머리주석), 그걸 지켜 주는 장치가 없었다. 이 스크립트가 그 장치다.
 *
 * 대비 점검(check-contrast)과 같은 발상이다 — 사람이 기억하기를 기대하지 않는다.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string): string => readFileSync(join(root, p), 'utf8');

const legal = read('apps/web/src/lib/legal.ts');
const content = read('apps/web/src/lib/legal-content.ts');

const problems: string[] = [];
const notes: string[] = [];

/* 1. 신원 정보 플레이스홀더 — 개인정보보호법 제30조 필수 기재사항 */
for (const m of legal.matchAll(/(\w+):\s*'(TODO_[^']*)'/g)) {
  problems.push(`${m[1]} 이 아직 플레이스홀더다 (${m[2]})`);
}

/* 2. 이메일 수집과 방침의 일치 (§9.4)
 *    비밀번호 로그인을 켜면 이메일이 처리 항목이 된다. 방침 제3항은 그걸
 *    '수집하지 않는 항목'으로 적어 두고 있으므로 둘이 동시에 참일 수 없다. */
const passwordLogin = process.env.AUTH_PASSWORD_LOGIN === 'true';
const emailListedAsNotCollected = /수집하지 않는 항목[\s\S]{0,700}?'이메일 주소'/.test(content);

if (passwordLogin && emailListedAsNotCollected) {
  problems.push(
    "AUTH_PASSWORD_LOGIN=true 인데 방침 제3항이 이메일을 '수집하지 않는 항목'으로 적고 있다\n" +
      '    → 테스트로만 쓸 거면 배포 환경에서 이 플래그를 끄고,\n' +
      '      실제로 쓸 거면 legal-content.ts 의 처리 항목·미수집 항목을 먼저 고칠 것',
  );
} else if (passwordLogin) {
  notes.push('비밀번호 로그인이 켜져 있고 방침도 이메일을 처리 항목으로 적고 있다');
} else {
  notes.push('비밀번호 로그인 꺼짐 — 방침의 이메일 미수집 표기와 일치');
}

/* 3. GA4 와 방침의 일치
 *    측정 ID 를 넣으면 Google LLC 가 수탁자로 추가된다. 위탁·국외이전·쿠키 세 조항이
 *    모두 맞아야 한다 — 하나라도 빠지면 방침이 실제 처리와 어긋난다. */
const gaEnabled = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '').length > 0;
const gaInPolicy = {
  위탁: /개인정보 처리의 위탁[\s\S]{0,900}?Google LLC/.test(content),
  국외이전: /국외 이전[\s\S]{0,900}?Google LLC/.test(content),
  쿠키: /자동 수집 장치[\s\S]{0,900}?Google Analytics/.test(content),
};
const gaMissing = Object.entries(gaInPolicy)
  .filter(([, ok]) => !ok)
  .map(([k]) => k);

if (gaEnabled && gaMissing.length > 0) {
  problems.push(
    `GA4 측정 ID 가 설정됐는데 방침의 [${gaMissing.join(', ')}] 조항에 Google 이 없다
` +
      '    → legal-content.ts 에 Google LLC 를 수탁자·국외 이전받는 자·쿠키 사용처로 적을 것',
  );
} else if (gaEnabled) {
  notes.push('GA4 켜짐 — 방침의 위탁·국외이전·쿠키 조항이 모두 Google 을 적고 있다');
} else {
  notes.push('GA4 꺼짐 (측정 ID 없음) — 스크립트가 로드되지 않는다');
}

/* 4. 국외 이전 고지 (법 제28조의8) — 호스팅·DB 가 국외 사업자다 */
if (!content.includes('국외 이전')) {
  problems.push('국외 이전 조항이 없다. 호스팅(Vercel)·DB(Neon)가 국외 사업자다');
}

console.log('\n법적 고지 점검');
console.log('─'.repeat(64));
for (const n of notes) console.log(`  · ${n}`);
for (const p of problems) console.log(`✗ ${p}`);

if (problems.length > 0) {
  console.log(`\n${problems.length}건 미해결 — 이 상태로 인증을 켜면 실제 위반이다.\n`);
  process.exitCode = 1;
} else {
  console.log('\n전 항목 통과.\n');
}
