/**
 * 대회 데이터 점검 리포트. `npm run races`
 * PRD §12 운영 원칙 — 월 1회, 대회 3개월 전부터는 격주로 돌린다.
 */

import { errorsOnly, races, seoReadyRaces, upcomingRaces, validateRaces } from '../packages/races/src/index.ts';

const today = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const issues = validateRaces(races, today);
const errors = errorsOnly(issues);
const warns = issues.filter((i) => i.level === 'warn');

console.log(`\n기준일 ${today}`);
console.log(`전체 ${races.length}개 · 예정 ${upcomingRaces(today).length}개 · SEO 준비 ${seoReadyRaces(today).length}개`);
console.log(`오류 ${errors.length} · 경고 ${warns.length}\n`);

if (errors.length > 0) {
  console.log('■ 오류 — 고치기 전엔 배포하지 않는다');
  for (const e of errors) console.log(`  ${e.slug} [${e.field}] ${e.message}`);
  console.log();
}

const byField = new Map<string, typeof warns>();
for (const w of warns) byField.set(w.field, [...(byField.get(w.field) ?? []), w]);

for (const [field, list] of [...byField].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`■ ${field} — ${list.length}건`);
  console.log(`  ${list[0]!.message}`);
  for (const w of list.slice(0, 8)) console.log(`    · ${w.slug}`);
  if (list.length > 8) console.log(`    … 외 ${list.length - 8}건`);
  console.log();
}

process.exit(errors.length > 0 ? 1 : 0);
