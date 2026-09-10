/**
 * 일러스트 슬롯 레지스트리.
 *
 * 그림은 `apps/web/public/illustrations/` 에 있고 여기서 슬롯에 물린다.
 * 화면 컴포넌트는 파일 이름을 모른다 — 그림을 바꾸려면 여기 `src` 만 고친다.
 *
 * ## 이 아트워크의 성질
 * 전부 3:2 가로 씬이고 **위쪽 절반이 비어 있는 하늘**이다. 배경색도 앱의 크림
 * 캔버스(#fbf7f0)와 거의 같다. 작게 오려서 카드 구석에 붙이라고 만든 그림이 아니라
 * **글자를 얹으라고 만든 그림**이다. 그래서 화면에서는 폭을 꽉 채워 깔고
 * 빈 하늘 위에 텍스트를 올린다 (`SceneCard` 참고).
 *
 * `ratio` 는 CLS 방어용이다 — 이미지가 늦게 와도 레이아웃이 밀리지 않는다 (PRD §10.9).
 * 원본이 2304×1536 로 크지만 `next/image` 가 요청 크기로 줄이고 WebP/AVIF 로 내보내므로
 * 원본을 미리 손질해서 넣을 필요는 없다.
 */

import type { SessionType } from '@runback/engine';

export type IllustrationSlot = {
  /** public/illustrations 아래 경로. null 이면 플레이스홀더 */
  src: string | null;
  alt: string;
  /** width / height */
  ratio: number;
  /** 어디에 쓰이는 그림인지 — 플레이스홀더에 표시된다 */
  note: string;
};

const SCENE = 1.5;

/**
 * 씬 아트워크는 **남/여 두 벌**이 통째로 있다 (`scene-female-*` / `scene-male-*`).
 *
 * 지금은 한 벌만 고른다. 러너의 성별에 맞춰 자동으로 고르려면 성별을 알아야 하는데,
 * PRD §9.4 가 성별 미수집으로 정해 뒀다 (O13 미결). 방침이 정해지기 전까지는
 * **여기 상수 하나로 전체를 바꾼다** — 화면 코드는 손댈 필요가 없다.
 *
 * 두 벌 다 리포에 있다. 쓰지 않는 쪽도 지우지 않는다 — 한쪽만 남기면
 * 나중에 성별 선택이 붙을 때 그림을 다시 만들어야 한다.
 */
const SCENE_SET: 'female' | 'male' = 'female';

const scene = (name: string): string => `/illustrations/scene-${SCENE_SET}-${name}.png`;

/*
 * `as const` 를 붙이지 않는다. 붙이면 `src` 가 문자열 리터럴로 굳어서
 * '그림이 아직 없는 슬롯' 분기가 타입상 도달 불가(never)가 되고,
 * 새 슬롯을 src: null 로 추가하는 순간 컴포넌트가 깨진다.
 */

export const ILLUSTRATIONS = {
  /* 세션 씬 — 오늘이 어떤 날인지 글자를 읽기 전에 알게 한다 */
  sessionStart: {
    src: scene('01-start'),
    alt: '',
    ratio: SCENE,
    note: '세션 씬 — 플랜 시작',
  },
  sessionEasy: {
    src: scene('02-easy'),
    alt: '',
    ratio: SCENE,
    note: '세션 씬 — 이지런',
  },
  sessionTempo: {
    src: scene('03-tempo'),
    alt: '',
    ratio: SCENE,
    note: '세션 씬 — 템포',
  },
  sessionInterval: {
    src: scene('04-interval'),
    alt: '',
    ratio: SCENE,
    note: '세션 씬 — 인터벌',
  },
  sessionLong: {
    src: scene('05-long'),
    alt: '',
    ratio: SCENE,
    note: '세션 씬 — 롱런',
  },
  sessionRecovery: {
    src: scene('06-recovery'),
    alt: '',
    ratio: SCENE,
    note: '세션 씬 — 회복·휴식',
  },
  sessionTaper: {
    src: scene('09-taper'),
    alt: '',
    ratio: SCENE,
    note: '세션 씬 — 테이퍼',
  },
  sessionFinish: {
    src: scene('10-finish'),
    alt: '',
    ratio: SCENE,
    note: '세션 씬 — 대회 당일',
  },

  /** 다음 대회 카드 바탕. 결승선 씬을 쓴다 — 이 카드가 가리키는 곳이 거기다 */
  raceScene: {
    src: scene('10-finish'),
    alt: '',
    ratio: SCENE,
    note: '다음 대회 카드 바탕',
  },

  /* 빈 상태 — '아직 없다'를 말하되 기운 빠지지 않게 */
  emptyPlan: {
    src: scene('07-consistency'),
    alt: '',
    ratio: SCENE,
    note: '빈 상태 — 플랜을 아직 만들지 않은 화면',
  },
  emptyLog: {
    src: scene('08-confidence'),
    alt: '',
    ratio: SCENE,
    note: '빈 상태 — 수행 기록이 아직 없는 화면',
  },

  /** '나' 탭 원형 아바타. 가로 씬을 정사각으로 잘라 쓴다 */
  profileAvatar: {
    src: scene('01-start'),
    alt: '',
    ratio: 1,
    note: "'나' 탭 아바타",
  },
  /** '나' 탭 하단 배웅 그림 */
  profileScene: {
    src: scene('05-long'),
    alt: '',
    ratio: SCENE,
    note: "'나' 탭 하단",
  },
} satisfies Record<string, IllustrationSlot>;

export type IllustrationName = keyof typeof ILLUSTRATIONS;

/** 세션 종류 → 씬. 아트워크가 없는 종류는 가장 가까운 것으로 접는다 */
const SESSION_SCENE: Record<SessionType, IllustrationName> = {
  rest: 'sessionRecovery',
  easy: 'sessionEasy',
  long: 'sessionLong',
  tempo: 'sessionTempo',
  interval: 'sessionInterval',
  // 리피티션은 인터벌과 같은 씬을 쓴다 — 러너 눈에는 둘 다 '빠르게 짧게'다
  repetition: 'sessionInterval',
  'marathon-pace': 'sessionTempo',
  race: 'sessionFinish',
};

/**
 * 오늘 세션에 맞는 씬을 고른다.
 *
 * 플랜이 아직 시작 전이면 세션이 아니라 '시작' 씬을 쓴다 —
 * 시작도 안 한 플랜에 이지런 그림을 얹으면 이미 굴러가는 것처럼 읽힌다.
 */
export function sessionIllustration(
  type: SessionType | undefined,
  phase?: 'before' | 'taper',
): IllustrationName {
  if (phase === 'before') return 'sessionStart';
  if (phase === 'taper') return 'sessionTaper';
  return type ? SESSION_SCENE[type] : 'sessionRecovery';
}
