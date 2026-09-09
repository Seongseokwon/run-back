/**
 * 일러스트 슬롯 레지스트리.
 *
 * 아직 그림이 없으므로 전부 `src: null` 이고, 화면에는 자리만 잡힌 플레이스홀더가 뜬다.
 * 그림이 준비되면 `apps/web/public/illustrations/` 에 넣고 여기 `src` 만 채우면
 * 컴포넌트 수정 없이 반영된다.
 *
 * `ratio` 는 CLS 방어용이다 — 이미지가 나중에 들어와도 레이아웃이 밀리지 않는다 (PRD §10.9).
 */

export type IllustrationSlot = {
  /** public/illustrations 아래 경로. null 이면 플레이스홀더 */
  src: string | null;
  alt: string;
  /** width / height */
  ratio: number;
  /** 어디에 쓰이는 그림인지 — 플레이스홀더에 표시된다 */
  note: string;
};

export const ILLUSTRATIONS = {
  heroShoe: {
    src: null,
    alt: '러닝화',
    ratio: 1.35,
    note: '홈 히어로 우측 — 러닝화와 점선 경로',
  },
  raceScene: {
    src: null,
    alt: '대회 코스 풍경',
    ratio: 1.6,
    note: '다음 대회 카드 배경 — 일출과 도시 실루엣',
  },
  runner: {
    src: null,
    alt: '달리는 사람',
    ratio: 0.85,
    note: '오늘의 훈련 우측 — 러너',
  },
  emptyPlan: {
    src: null,
    alt: '아직 플랜이 없습니다',
    ratio: 1.2,
    note: '빈 상태 — 플랜을 아직 만들지 않은 화면',
  },
  emptyLog: {
    src: null,
    alt: '아직 남긴 러닝이 없습니다',
    ratio: 1.2,
    note: '빈 상태 — 수행 기록이 아직 없는 화면',
  },
} as const satisfies Record<string, IllustrationSlot>;

export type IllustrationName = keyof typeof ILLUSTRATIONS;
