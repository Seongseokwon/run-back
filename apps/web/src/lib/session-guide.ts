import type { Plan, PlanWeek, SessionType } from '@runback/engine';

/**
 * 세션 수행 가이드 — 입문자(P1)에게 **"이걸 어떻게 뛰는가"**를 알려 준다.
 *
 * 여기까지 화면이 주던 것은 숫자뿐이었다 — `EASY RUN 2.8km / 7:37~8:39`.
 * 처음 달리는 사람은 그 숫자를 보고 무엇을 해야 할지 알 수 없다. §2 의 P1(첫 대회를
 * 앞둔 입문자)이 최우선 타깃인데 정작 그 사람이 가장 막히는 자리가 비어 있었다.
 *
 * ## 규칙 셋 — 어기면 이 파일의 존재 이유가 없어진다
 *
 * 1. **숫자를 쓰지 않는다.** 거리·페이스·시간·반복 횟수는 전부 엔진이 낸다
 *    (`session.distanceKm`, `paces`, `session.structure`). 여기에 "20분 정도"라고
 *    적는 순간 엔진이 낸 값과 어긋나고, 어긋나면 어느 쪽을 믿어야 할지 알 수 없다.
 *    이 파일이 말하는 것은 **강도의 느낌과 판단 기준**뿐이다.
 * 2. **겁주지 않는다.** 위험을 말해야 할 때도 무엇을 하면 되는지로 끝맺는다 (§7.3 과 같은 원칙).
 * 3. **의학적 조언을 하지 않는다** (§7.10). 통증·부상은 여기서 다루지 않고
 *    화면 하단 고정 고지(`SAFETY_NOTICE`)가 맡는다.
 *
 * ## 왜 엔진이 아니라 여기인가
 *
 * 문장이지 계산이 아니다. `lib/goals.ts`·`lib/tools.ts` 와 같은 자리이고,
 * 세션 타입의 한글 라벨(`plan-view.ts` 의 `TYPE_TITLE`)도 이미 웹 쪽에 있다.
 * 엔진은 `SessionType` 이라는 타입만 빌려준다.
 */

export type SessionGuide = {
  /** 이 세션을 어떻게 뛰는가. 한 문장 */
  how: string;
  /** 판단 기준 — 잘 하고 있는지 스스로 알 수 있는 신호 */
  check: string;
};

/**
 * 세션 타입별 가이드. **타입마다 손으로 쓴다** — 템플릿에 단어만 바꾸면
 * 여덟 개가 같은 말을 하게 되고, 그러면 읽을 이유가 없어진다.
 *
 * `race` 는 넣지 않는다. 대회 당일에 필요한 건 훈련 지시가 아니다.
 */
const GUIDES: Partial<Record<SessionType, SessionGuide>> = {
  easy: {
    how: '옆 사람과 대화가 되는 속도로 달립니다. 느리다고 느껴지는 것이 정상입니다.',
    check: '끝났을 때 조금 더 갈 수 있을 것 같으면 제대로 뛴 것입니다. 숨이 차면 페이스보다 느리게 가도 됩니다.',
  },
  long: {
    how: '이번 주에서 가장 오래 달리는 날입니다. 이지런과 같거나 더 느려도 괜찮습니다.',
    check: '목적은 빠르게가 아니라 오래입니다. 중간에 걷더라도 예정한 거리를 채우는 편이 낫습니다.',
  },
  tempo: {
    how: '조금 힘들지만 계속 이어갈 수 있는 강도입니다. 대화는 짧은 단어 정도만 가능합니다.',
    check: '중간에 속도를 못 줄이겠다 싶으면 너무 빠른 것입니다. 끝까지 같은 페이스로 가는 것이 목표입니다.',
  },
  interval: {
    how: '짧고 빠르게 달리고 그만큼 회복하는 것을 반복합니다. 회복 구간은 걷지 말고 아주 느린 조깅으로 채웁니다.',
    check: '마지막 반복이 첫 반복과 비슷한 속도로 끝나야 합니다. 뒤로 갈수록 무너지면 처음이 빨랐던 것입니다.',
  },
  repetition: {
    how: '아주 짧게 빠르게 달리고 충분히 쉽니다. 심폐보다 다리의 움직임을 빠르게 만드는 것이 목적입니다.',
    check: '숨이 턱까지 차야 하는 세션이 아닙니다. 매 반복을 같은 자세로 깔끔하게 끝내는 쪽이 중요합니다.',
  },
  'marathon-pace': {
    how: '대회 당일에 쓸 페이스로 달려 보는 날입니다. 몸에 그 속도를 익혀 두는 것이 목적입니다.',
    check: '힘들면 페이스가 아직 빠른 것이고, 너무 편하면 조금 올려도 됩니다. 숫자보다 감각을 기억해 두세요.',
  },
  rest: {
    how: '달리지 않는 날입니다. 몸이 좋아지는 것은 훈련 중이 아니라 쉬는 동안입니다.',
    check: '몸이 가벼워서 더 뛰고 싶어도 그대로 쉽니다. 여기서 아낀 것이 다음 세션에 나옵니다.',
  },
};

export function sessionGuide(type: SessionType): SessionGuide | undefined {
  return GUIDES[type];
}

/**
 * `session.structure` 에 나오는 훈련 용어 사전.
 *
 * ⚠️ **이게 이 파일이 고치는 실제 어긋남이다.** §7.8 은 입문자에게 존을 E·M 두 개만
 * 노출하기로 했고 페이스표는 그걸 지키는데, 정작 첫 주 첫 세션 설명에
 * `이지런 후 스트라이드 20초 × 4` 가 그대로 나온다. 존 배지는 가려 놓고 용어는
 * 통과시키니 입문자는 그 문장을 읽고 무엇을 해야 할지 알 수 없다.
 *
 * 그래서 **화면에 실제로 뜬 문자열에 들어 있는 용어만** 골라 붙인다.
 * 안 나온 용어까지 설명하면 그건 사전이지 가이드가 아니다.
 */
export type GuideTerm = {
  /** 화면에 뜨는 이름 */
  term: string;
  /**
   * `structure` 에서 찾을 조각. 표시 이름과 다를 수 있다 —
   * 엔진은 `회복 1분 조깅` 이라고 쓰지만 사전에 '회복' 한 글자를 올리면
   * 무슨 항목인지 읽히지 않는다.
   */
  match: string;
  desc: string;
};

/**
 * 엔진이 `structure` 에 쓰는 말과 1:1 로 맞춘다 (`packages/engine/src/sessions.ts`).
 * 엔진이 문구를 바꾸면 여기도 바뀌어야 하므로 `session-guide.test.ts` 가
 * 실제 플랜에서 뽑은 structure 로 이 대응을 검사한다.
 */
const TERMS: readonly GuideTerm[] = [
  {
    term: '스트라이드',
    match: '스트라이드',
    desc: '이지런을 마친 뒤 짧게 빠르게 달렸다가 완전히 회복하는 것을 반복합니다. 전력질주가 아니라 자세가 흐트러지지 않는 선까지만 올립니다.',
  },
  {
    term: '워밍업',
    match: '워밍업',
    desc: '본 훈련 전에 아주 느리게 달려 몸을 데우는 구간입니다. 빠른 세션일수록 건너뛰지 않는 편이 좋습니다.',
  },
  {
    term: '쿨다운',
    match: '쿨다운',
    desc: '훈련을 끝내고 느린 조깅으로 마무리하는 구간입니다. 갑자기 멈추는 것보다 회복이 빠릅니다.',
  },
  {
    term: '크루즈 인터벌',
    match: '크루즈 인터벌',
    desc: '템포 강도를 짧게 끊어서 반복하는 방식입니다. 한 번에 오래 달리기 부담스러울 때 같은 효과를 나눠 담습니다.',
  },
  {
    term: '회복 조깅',
    match: '회복',
    desc: '반복 사이에 쉬는 구간입니다. 멈추지 말고 아주 느린 조깅으로 채웁니다.',
  },
];

/** `structure` 문자열에 실제로 등장한 용어만 돌려준다. 없으면 빈 배열 */
export function guideTermsIn(structure: string | undefined): GuideTerm[] {
  if (!structure) return [];
  return TERMS.filter((t) => structure.includes(t.match));
}

/**
 * 이 플랜에 **실제로 들어 있는** 세션 종류와 용어만 추린다.
 *
 * 플랜 전체를 설명하는 자리(`/plan/result`)에서 여덟 종류를 다 늘어놓으면,
 * 주 3일 플랜을 받은 입문자가 자기 플랜에 없는 리피티션 설명까지 읽게 된다.
 * 순서는 `GUIDES` 의 선언 순서를 따른다 — 등장 순서로 하면 주차마다 달라진다.
 *
 * `rest` 는 뺀다. 휴식은 '수행 방법'이 궁금한 세션이 아니고,
 * 쉬는 날 안내는 `/today` 가 이미 자기 카드로 하고 있다.
 */
export function planGuide(weeks: PlanWeek[]): {
  sessions: { type: SessionType; guide: SessionGuide }[];
  terms: GuideTerm[];
} {
  const present = new Set<SessionType>();
  const structures: string[] = [];
  for (const week of weeks) {
    for (const s of week.sessions) {
      present.add(s.type);
      if (s.structure) structures.push(s.structure);
    }
  }

  const sessions = (Object.keys(GUIDES) as SessionType[])
    .filter((type) => type !== 'rest' && present.has(type))
    .map((type) => ({ type, guide: GUIDES[type]! }));

  const joined = structures.join(' ');
  const terms = TERMS.filter((t) => joined.includes(t.match));

  return { sessions, terms };
}

/**
 * 이 플랜의 사용자를 입문자로 볼 것인가.
 *
 * 페이스표(§7.8)·가이드·앞으로 붙을 것이 **같은 한 줄**을 보게 한다.
 * 화면마다 `fitness.kind === 'novice'` 를 따로 적으면 한쪽만 바뀌는 날이 온다.
 */
export function planLevel(plan: Plan): 'novice' | 'full' {
  return plan.input.fitness.kind === 'novice' ? 'novice' : 'full';
}

/**
 * 가이드를 보여 줄 것인가.
 *
 * 기준을 §7.8 과 **같은 것**으로 둔다 — 페이스표가 존을 접는 그 기준이다.
 * 여기만 다른 조건을 쓰면 한 화면에서 "입문자"의 정의가 둘이 된다.
 *
 * 경험자에게는 감추는 쪽이 맞다. `이지런 후 스트라이드 20초 × 4` 를 읽고 바로
 * 움직일 수 있는 사람에게 설명을 붙이면 그건 정보가 아니라 소음이다.
 */
export function showsGuide(level: 'novice' | 'full'): boolean {
  return level === 'novice';
}
