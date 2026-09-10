/**
 * 저장된 플랜 → 화면이 쓰는 모양으로.
 *
 * 엔진과 저장소를 잇는 자리다. 저장소는 PlanInput 을 JSON 으로 들고만 있고(§9.7),
 * 플랜 본문은 여기서 generatePlan 으로 되살린다. 엔진이 결정론적이라 가능한 구조다.
 *
 * ⚠️ generatePlan 에 넘기는 today 는 **저장 시점의 input.today** 다. 오늘 날짜가 아니다.
 * 플랜은 "그날 기준으로 역산한 결과"이고, 나중에 열어도 같은 플랜이 나와야 한다 (§4.2).
 * 그래서 이 파일의 함수들은 today 를 받지 않는다 — 진행률·이번 주 계산은 화면이
 * plan-view.ts 에 today 를 넘겨서 한다.
 */

import { ENGINE_VERSION, generatePlan, type Plan } from '@runback/engine';
import { findRace, type Race } from '@runback/races';
import { listLogsByUser, listSavedPlans, type SavedPlanRecord, type SessionLogRecord } from '@runback/db';
import { parsePlanInput } from './plan-input.ts';
import type { LogIndex } from './plan-view.ts';
import { currentUserId } from './session.ts';

export type MyRace = {
  /** SavedPlan.id — 수행 기록(F-12)이 이 값에 달린다 */
  planId: string;
  plan: Plan;
  /**
   * 큐레이션 대회. **없을 수 있다** — 위저드가 날짜 직접 입력을 지원하고(F-01),
   * 대회 데이터에서 지난 대회가 빠지면 예전에 저장한 플랜의 슬러그도 사라진다.
   * 화면은 이 값 대신 아래 name/date/key 를 쓴다.
   */
  race: Race | undefined;
  /** 화면에 쓰는 이름. 대회가 없으면 날짜로 만든다 */
  name: string;
  /** 대회일. 대회가 없어도 input.raceDate 가 항상 있다 */
  date: string;
  /** `/races/[slug]` 의 라우팅 키. 대회가 있으면 slug, 없으면 planId */
  key: string;
  distanceKm: number;
  /** 목표 표시용. '1:55:00' 또는 '완주' */
  goalLabel: string;
  /** 저장 시점의 엔진 버전 */
  engineVersion: string;
  /** 날짜 → 수행 기록 (F-12). 완료 판정은 전부 이걸 본다 */
  logs: LogIndex;
  /**
   * 저장된 버전과 현재 엔진이 다르다.
   * 지금은 표시만 하고 자동 적용하지 않는다 — 훈련 중인 플랜이 조용히 달라지면 안 된다 (§9.7).
   * "개선된 플랜으로 업데이트하시겠어요?" UI 는 Phase 3 에서 붙인다.
   */
  outdated: boolean;
};

/** 내가 등록한 대회. 대회일이 가까운 것부터 */
export async function myRaces(): Promise<MyRace[]> {
  const userId = await currentUserId();
  if (!userId) return [];

  // 플랜마다 기록을 조회하면 N+1 이 된다. 한 번에 가져와 planId 로 나눈다
  const [records, allLogs] = await Promise.all([listSavedPlans(userId), listLogsByUser(userId)]);

  const byPlan = new Map<string, Map<string, SessionLogRecord>>();
  for (const log of allLogs) {
    let m = byPlan.get(log.planId);
    if (!m) byPlan.set(log.planId, (m = new Map()));
    m.set(log.date, log);
  }

  return records
    .map((r) => toMyRace(r, byPlan.get(r.id) ?? new Map()))
    .filter((r): r is MyRace => r !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 내 대회 하나. 없으면 undefined — 호출부가 404 로 처리한다.
 * 키는 대회 슬러그이거나, 대회가 없는 플랜이면 planId 다.
 */
export async function findMyRace(key: string): Promise<MyRace | undefined> {
  return (await myRaces()).find((r) => r.key === key);
}

/** 지금 화면의 기준이 되는 대회 — 가장 가까운 것 */
export async function primaryRace(): Promise<MyRace | undefined> {
  return (await myRaces())[0];
}

/**
 * 저장 레코드 하나를 화면 모양으로. **입력이 깨졌을 때만** null 이다.
 *
 * 대회를 못 찾는 건 떨어뜨릴 이유가 아니다 — 날짜만 직접 입력한 플랜(F-01 폴백)과
 * 대회 데이터에서 빠진 옛 대회가 여기 걸린다. 사용자가 저장한 플랜이 목록에서
 * 조용히 사라지는 쪽이 훨씬 나쁘다.
 */
function toMyRace(record: SavedPlanRecord, logs: LogIndex): MyRace | null {
  const input = parsePlanInput(record.input);
  if (!input) return null;

  const race = record.raceSlug ? findRace(record.raceSlug) : undefined;
  const plan = generatePlan(input);

  return {
    planId: record.id,
    plan,
    race,
    name: race?.nameKo ?? fallbackName(input.raceDate, input.raceDistanceM),
    date: race?.date ?? input.raceDate,
    key: race?.slug ?? record.id,
    distanceKm: input.raceDistanceM / 1000,
    goalLabel: input.goal.kind === 'time' ? formatGoal(input.goal.targetSec) : '완주',
    engineVersion: record.engineVersion,
    logs,
    outdated: record.engineVersion !== ENGINE_VERSION,
  };
}

/** 대회를 고르지 않은 플랜의 이름. 지어내지 않고 사용자가 넣은 값만 쓴다 */
function fallbackName(raceDate: string, distanceM: number): string {
  const [y, m, d] = raceDate.split('-');
  const label = DISTANCE_NAME[distanceM] ?? `${Math.round(distanceM / 1000)}km`;
  return `${y}년 ${Number(m)}월 ${Number(d)}일 ${label}`;
}

const DISTANCE_NAME: Record<number, string> = {
  5000: '5K',
  10000: '10K',
  21097.5: '하프',
  42195: '풀코스',
};

function formatGoal(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
