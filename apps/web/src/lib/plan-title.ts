/**
 * 저장된 플랜의 목록용 제목.
 *
 * plan-actions.ts 에 두면 안 된다 — `'use server'` 파일은 **async 함수만** export 할 수 있어서
 * 동기 헬퍼가 하나라도 섞이면 모듈 전체가 컴파일되지 않는다.
 */

import { findRace } from '@runback/races';
import type { PlanRequest } from './plan-url.ts';

/** '2026 MBN 서울마라톤 하프 1:55' 같은 목록용 제목 */
export function planTitle(req: PlanRequest): string {
  const race = req.raceSlug ? findRace(req.raceSlug) : undefined;
  const name = race?.nameKo ?? req.input.raceDate;
  const distance = DISTANCE_LABEL[req.input.raceDistanceM] ?? '';
  const goal =
    req.input.goal.kind === 'time' ? formatGoalShort(req.input.goal.targetSec) : '완주';
  return [name, distance, goal].filter(Boolean).join(' ');
}

const DISTANCE_LABEL: Record<number, string> = {
  5000: '5K',
  10000: '10K',
  21097.5: '하프',
  42195: '풀',
};

/** 1:55:00 → '1:55', 42:30 → '42:30'. 제목에 초까지 넣으면 길어지기만 한다 */
function formatGoalShort(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
