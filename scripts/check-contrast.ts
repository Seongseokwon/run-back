/**
 * 명도 대비 점검. `npm run contrast`
 *
 * 크림 배경 위의 따뜻한 회색은 눈에 부드럽지만 대비가 쉽게 무너진다.
 * 실제로 초기 팔레트는 안전 고지(의학적 조언 아님)가 2.09:1 로 거의 보이지 않았다.
 * 그래서 색을 눈으로 고르지 않고 여기서 재서 정한다.
 *
 * 기준 (WCAG 2.2)
 *  - 본문 텍스트 4.5:1  — 1.4.3
 *  - 큰 텍스트 3:1      — 18.66px bold 또는 24px 이상
 *  - 비텍스트 UI 3:1    — 1.4.11 (입력 테두리처럼 컨트롤을 식별하는 요소)
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const CSS = join(dirname(fileURLToPath(import.meta.url)), '../apps/web/src/app/globals.css');

function parseTokens(css: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6})/gi)) {
    out.set(m[1]!, m[2]!.toLowerCase());
  }
  return out;
}

const channels = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const linear = (c: number): number => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map(linear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** 토큰이 무엇으로 쓰이는지. 기준이 여기서 갈린다 */
type Role = { token: string; min: number; on: string[]; note: string };

const CONTRACT: Role[] = [
  { token: 'ink', min: 4.5, on: ['canvas', 'surface'], note: '본문·제목' },
  { token: 'ink-muted', min: 4.5, on: ['canvas', 'surface'], note: '보조 본문 — 설명·캡션·고지' },
  { token: 'brand-ink', min: 4.5, on: ['canvas', 'surface', 'brand-soft'], note: '브랜드 색 글자' },
  { token: 'verdict-safe', min: 4.5, on: ['canvas', 'surface'], note: '판정 배지' },
  { token: 'verdict-challenging', min: 4.5, on: ['canvas', 'surface'], note: '판정 배지' },
  { token: 'verdict-unrealistic', min: 4.5, on: ['canvas', 'surface'], note: '판정 배지' },
  { token: 'brand', min: 3, on: ['canvas', 'surface'], note: '채움·테두리 (비텍스트)' },
  { token: 'accent', min: 3, on: ['canvas', 'surface'], note: '아이콘 (비텍스트)' },
  { token: 'line-input', min: 3, on: ['surface'], note: '입력 테두리 (비텍스트)' },
];

const tokens = parseTokens(readFileSync(CSS, 'utf8'));
let failed = 0;

console.log('\n토큰                   기준   최저값  배경         용도');
console.log('─'.repeat(72));

for (const role of CONTRACT) {
  const color = tokens.get(role.token);
  if (!color) {
    console.log(`${role.token.padEnd(22)} — 토큰을 찾을 수 없다`);
    failed++;
    continue;
  }
  let worst = Infinity;
  let worstBg = '';
  for (const bg of role.on) {
    const bgColor = tokens.get(bg);
    if (!bgColor) continue;
    const r = contrast(color, bgColor);
    if (r < worst) {
      worst = r;
      worstBg = bg;
    }
  }
  const ok = worst >= role.min;
  if (!ok) failed++;
  console.log(
    `${ok ? '  ' : '✗ '}${role.token.padEnd(20)} ${String(role.min).padStart(4)}  ${worst.toFixed(2).padStart(6)}  ${worstBg.padEnd(11)} ${role.note}`,
  );
}

// 흰 글씨를 얹는 채움색은 반대 방향으로도 확인해야 한다
const brand = tokens.get('brand');
if (brand) {
  const onBrand = contrast('#ffffff', brand);
  const ok = onBrand >= 4.5;
  if (!ok) failed++;
  console.log(`${ok ? '  ' : '✗ '}${'흰 글씨 on brand'.padEnd(20)}  4.5  ${onBrand.toFixed(2).padStart(6)}  ${'brand'.padEnd(11)} 주 버튼`);
}

console.log('─'.repeat(72));
if (failed > 0) {
  console.log(`\n✗ ${failed}건이 기준에 못 미친다. 색을 조정할 것.\n`);
  process.exit(1);
}
console.log('\n전 항목 통과.\n');
