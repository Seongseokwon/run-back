/**
 * 일러스트 원본 재출력. `npm run art`
 *
 * 왜 필요했나 (PRD O18): 납품 원본이 2304×1536 PNG 로 장당 4~5MB, 20장 합쳐 88MB 였다.
 * 사용자가 받는 용량은 `next/image` 가 알아서 줄여 주므로 문제가 아니었지만,
 * **리포 무게와 서버 번들 추적**이 문제였다.
 *
 * 앱이 쓰는 최대 슬롯 폭은 448px 이다 (`scene.tsx` 의 SIZES). 1200px 이면 DPR 2.7배까지
 * 커버한다 — 부드러운 일러스트라 그 이상은 눈에 차이가 없다.
 *
 * PNG 대신 WebP 인 이유: 원본이 전부 불투명이라 알파가 필요 없고, 같은 1200px 에서
 * PNG 1279KB / WebP(q90) 71KB 로 18배 차이가 난다. `next/image` 는 어차피 다시
 * 인코딩해서 내보내므로 소스 포맷이 화질에 미치는 영향은 없다.
 *
 * ⚠️ 원본을 덮어쓴다. 되돌리려면 git 에서 복원한다.
 */

import { createRequire } from 'node:module';
import { readdirSync, statSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'apps/web/public/illustrations');

/**
 * sharp 는 next 가 끌고 온 것이라 워크스페이스 의존성이 아니다 —
 * 타입도 없으므로 **쓰는 만큼만** 좁혀서 선언한다. 이걸 위해 의존성을 추가하지 않는다
 * (이 스크립트는 원본을 다시 받을 때만 돌린다).
 */
type SharpPipeline = {
  resize(options: { width: number }): SharpPipeline;
  webp(options: { quality: number }): SharpPipeline;
  toFile(path: string): Promise<{ size: number }>;
};
type SharpFactory = (input: string) => SharpPipeline;

const require_ = createRequire(import.meta.url);
const sharp = require_(
  join(root, 'node_modules/.pnpm/sharp@0.35.4_@types+node@22.20.1/node_modules/sharp/dist/index.cjs'),
) as SharpFactory;

/** 슬롯 최대 폭 448px × DPR 2.7 */
const TARGET_WIDTH = 1200;
const QUALITY = 90;

const sources = readdirSync(dir).filter((f) => f.endsWith('.png'));
if (sources.length === 0) {
  console.log('변환할 PNG 가 없습니다. 이미 처리된 것 같습니다.');
  process.exit(0);
}

let before = 0;
let after = 0;

for (const file of sources) {
  const from = join(dir, file);
  const to = from.replace(/\.png$/, '.webp');

  const original = statSync(from).size;
  const info = await sharp(from).resize({ width: TARGET_WIDTH }).webp({ quality: QUALITY }).toFile(to);

  before += original;
  after += info.size;
  unlinkSync(from);

  console.log(
    `${file.padEnd(34)} ${(original / 1048576).toFixed(2)}MB → ${(info.size / 1024).toFixed(0)}KB`,
  );
}

console.log(
  `\n${sources.length}장 · ${(before / 1048576).toFixed(1)}MB → ${(after / 1048576).toFixed(2)}MB ` +
    `(${(100 - (after / before) * 100).toFixed(1)}% 감소)`,
);
console.log('\n⚠️ lib/illustrations.ts 의 확장자가 .webp 인지 확인할 것.');
