/**
 * 브랜드 자산 재출력. `npm run brand`
 *
 * 납품 마스터(`docs/brand/`)에서 `apps/web/public/brand/` 의 운영 파일을 만든다.
 * 새 마스터를 받으면 이 명령 하나로 전부 다시 뽑는다.
 *
 * ## 왜 납품 사이즈를 그대로 쓰지 않나
 *
 * 납품본은 **여백이 30%** 라 마크가 캔버스의 37% 만 차지한다. 그 상태로 16px 파비콘을
 * 만들면 마크가 6px 이 되어 되감기 셰브론이 통째로 뭉개진다 — 의뢰서 §5 의 **1순위 요건**
 * ("16×16px 에서 읽혀야 한다")에 걸린다.
 *
 * 그래서 마크만 잘라 내고 **쓰임새별로 여백을 다시 준다.** 형태·색은 손대지 않는다.
 *
 * | 쓰임 | 여백 | 배경 | 이유 |
 * |---|---|---|---|
 * | 파비콘 16·32·48 | 8% | 투명 | 작을수록 꽉 채워야 읽힌다 |
 * | PWA `any` 192·512 | 12% | 투명 | 런처가 자기 판을 깔아 준다 |
 * | maskable 512 | 18% | 크림 | 안드로이드가 바깥 10% 를 잘라낸다 (중앙 80% 안전) |
 * | apple-touch 180 | 12% | 크림 | **iOS 는 투명을 검정으로 채운다** |
 */

import { createRequire } from 'node:module';
import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'docs/brand');
const OUT = join(root, 'apps/web/public/brand');

type Pipeline = {
  ensureAlpha(): Pipeline;
  raw(): Pipeline;
  extract(o: { left: number; top: number; width: number; height: number }): Pipeline;
  resize(w: number, h: number, o?: Record<string, unknown>): Pipeline;
  composite(o: Array<Record<string, unknown>>): Pipeline;
  flatten(o: { background: Record<string, number> }): Pipeline;
  png(o?: Record<string, unknown>): Pipeline;
  toBuffer(o?: { resolveWithObject: boolean }): Promise<never>;
  toFile(p: string): Promise<{ size: number }>;
};
type Factory = ((input: string | Buffer) => Pipeline) & ((o: Record<string, unknown>) => Pipeline);

/** sharp 는 next 가 끌고 온 것이라 워크스페이스 의존성이 아니다 */
const sharp = createRequire(import.meta.url)(
  join(root, 'node_modules/.pnpm/sharp@0.35.4_@types+node@22.20.1/node_modules/sharp/dist/index.cjs'),
) as Factory;

/** 앱 캔버스와 같은 크림. 불투명이 필요한 자리에만 깐다 */
const CREAM = { r: 251, g: 247, b: 240, alpha: 1 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

const ICON_MASTER = join(SRC, 'runback-icon-master.png');

/** 마스터에서 마크만 정사각으로 잘라 낸다 (알파 경계 기준) */
async function markOnly(): Promise<Buffer> {
  const { data, info } = (await sharp(ICON_MASTER)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })) as unknown as {
    data: Buffer;
    info: { width: number; height: number; channels: number };
  };
  const { width: w, height: h, channels: c } = info;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if ((data[(y * w + x) * c + 3] ?? 0) > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error('마스터에서 마크를 찾지 못했습니다 (전부 투명)');

  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const side = Math.max(cw, ch);
  const left = Math.max(0, Math.round(minX - (side - cw) / 2));
  const top = Math.max(0, Math.round(minY - (side - ch) / 2));

  return (await sharp(ICON_MASTER)
    .extract({ left, top, width: Math.min(side, w - left), height: Math.min(side, h - top) })
    .png()
    .toBuffer()) as unknown as Buffer;
}

const mark = await markOnly();

async function icon(
  name: string,
  size: number,
  padPct: number,
  background: Record<string, number>,
): Promise<void> {
  const inner = Math.round(size * (1 - padPct * 2));
  const scaled = (await sharp(mark)
    .resize(inner, inner, { fit: 'contain', background: CLEAR })
    .png()
    .toBuffer()) as unknown as Buffer;

  const info = await sharp({
    create: { width: size, height: size, channels: 4, background: CLEAR },
  })
    .composite([{ input: scaled, gravity: 'center' }])
    .flatten({ background })
    .png({ compressionLevel: 9 })
    .toFile(join(OUT, name));

  console.log(`  ${name.padEnd(26)} ${size}px  여백 ${(padPct * 100).toFixed(0)}%  ${(info.size / 1024).toFixed(1)}KB`);
}

mkdirSync(OUT, { recursive: true });

console.log('아이콘');
// 파비콘 — 작을수록 꽉 채워야 읽힌다
await icon('favicon-16.png', 16, 0.08, CLEAR);
await icon('favicon-32.png', 32, 0.08, CLEAR);
await icon('favicon-48.png', 48, 0.08, CLEAR);
// PWA any — 런처가 자기 판을 깔아 준다
await icon('icon-192.png', 192, 0.12, CLEAR);
await icon('icon-512.png', 512, 0.12, CLEAR);
// 앱 화면에서 쓰는 마크
await icon('icon-1024.png', 1024, 0.12, CLEAR);
// maskable — 안드로이드가 바깥 10% 를 잘라낸다
await icon('icon-maskable-512.png', 512, 0.18, CREAM);
// iOS 는 투명을 검정으로 채운다
await icon('apple-touch-icon.png', 180, 0.12, CREAM);

console.log('\n로고 (납품본 그대로 — 여백 조정 불필요)');
const LOGOS: ReadonlyArray<readonly [from: string, to: string]> = [
  ['runback-logo-horizontal-640.png', 'logo-horizontal-640.png'],
  ['runback-logo-horizontal-1600.png', 'logo-horizontal-1600.png'],
];

for (const [from, to] of LOGOS) {
  copyFileSync(join(SRC, from), join(OUT, to));
  console.log(`  ${to.padEnd(26)} ${(statSync(join(OUT, to)).size / 1024).toFixed(1)}KB`);
}
