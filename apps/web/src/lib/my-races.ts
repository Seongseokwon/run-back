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
import { listSavedPlans, type SavedPlanRecord } from '@runback/db';
import { parsePlanInput } from './plan-input.ts';
import { currentUserId } from './session.ts';

export type MyRace = {
  /** SavedPlan.id — 수행 기록(F-12)이 이 값에 달린다 */
  planId: string;
  plan: Plan;
  race: Race;
  distanceKm: number;
  /** 목표 표시용. '1:55:00' 또는 '완주' */
  goalLabel: string;
  /** 저장 시점의 엔진 버전 */
  engineVersion: string;
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

  const records = await listSavedPlans(userId);
  return records
    .map(toMyRace)
    .filter((r): r is MyRace => r !== null)
    .sort((a, b) => a.race.date.localeCompare(b.race.date));
}

/** 내 대회 하나. 없으면 undefined — 호출부가 404 로 처리한다 */
export async function findMyRace(slug: string): Promise<MyRace | undefined> {
  return (await myRaces()).find((r) => r.race.slug === slug);
}

/** 지금 화면의 기준이 되는 대회 — 가장 가까운 것 */
export async function primaryRace(): Promise<MyRace | undefined> {
  return (await myRaces())[0];
}

/**
 * 저장 레코드 하나를 화면 모양으로. 되살릴 수 없으면 null 이다.
 *
 * ⚠️ 대회를 고르지 않고 날짜만 직접 입력한 플랜(raceSlug 없음)은 지금 여기서 떨어진다.
 * 앱 셸의 대회 탭이 Race 를 전제로 짜여 있어서다. 직접 입력 플랜도 보이게 하려면
 * MyRace.race 를 옵셔널로 바꾸고 화면 5개를 같이 손봐야 한다 — O16(다중 목표)과 함께 처리한다.
 */
function toMyRace(record: SavedPlanRecord): MyRace | null {
  const input = parsePlanInput(record.input);
  if (!input) return null;

  const race = record.raceSlug ? findRace(record.raceSlug) : undefined;
  if (!race) return null;

  const plan = generatePlan(input);

  return {
    planId: record.id,
    plan,
    race,
    distanceKm: input.raceDistanceM / 1000,
    goalLabel: input.goal.kind === 'time' ? formatGoal(input.goal.targetSec) : '완주',
    engineVersion: record.engineVersion,
    outdated: record.engineVersion !== ENGINE_VERSION,
  };
}

function formatGoal(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
