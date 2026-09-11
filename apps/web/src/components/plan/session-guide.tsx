import type { PlanWeek, SessionType } from '@runback/engine';
import { Card, SectionLabel } from '@/components/ui/card';
import { guideTermsIn, planGuide, sessionGuide, type GuideTerm } from '@/lib/session-guide';
// 카드에 뜬 것과 같은 이름을 쓴다 — 'EASY RUN' 을 보고 온 사람이 같은 말을 찾을 수 있어야 한다
import { sessionTitle } from '@/lib/plan-view';

/**
 * 세션 수행 가이드 — 입문자에게만 붙는다 (§7.8 과 같은 기준).
 * 문장은 전부 `lib/session-guide.ts` 에 있다. 여기는 그리기만 한다.
 */

function Term({ term }: { term: GuideTerm }) {
  return (
    <p className="text-label leading-relaxed text-ink-muted">
      <span className="font-bold text-ink">{term.term}</span> {term.desc}
    </p>
  );
}

/**
 * 오늘 할 세션 하나짜리. `/today` 와 `/races/[slug]` 의 훈련 카드 바로 아래.
 *
 * 카드 안(`note`)에 넣지 않는 이유: 그 자리는 이미 `structure` 가 쓰고 있고,
 * 씬 아래 흰 바닥은 버튼 자리다. 세 가지를 한 상자에 넣으면 오늘 뭘 하는지가 안 읽힌다.
 */
export function TodaySessionGuide({
  type,
  structure,
}: {
  type: SessionType;
  structure?: string | undefined;
}) {
  const guide = sessionGuide(type);
  const terms = guideTermsIn(structure);
  if (!guide && terms.length === 0) return null;

  return (
    <Card tone="sunken" className="space-y-2 px-5 py-4">
      <SectionLabel>어떻게 뛰나요</SectionLabel>
      {guide ? (
        <>
          <p className="text-body leading-relaxed text-ink">{guide.how}</p>
          <p className="text-label leading-relaxed text-ink-muted">{guide.check}</p>
        </>
      ) : null}
      {terms.map((term) => (
        <Term key={term.term} term={term} />
      ))}
    </Card>
  );
}

/**
 * 플랜 전체에 나오는 세션 종류. `/plan/result` 의 페이스표 아래.
 *
 * 주차 아코디언의 줄마다 붙이지 않는다 — 같은 설명이 수십 번 반복되면
 * 플랜이 안 읽힌다. 종류당 한 번만 말하고, 그 자리는 페이스표 다음이 맞다.
 */
export function PlanSessionGuide({ weeks }: { weeks: PlanWeek[] }) {
  const { sessions, terms } = planGuide(weeks);
  if (sessions.length === 0 && terms.length === 0) return null;

  return (
    <Card className="px-5 py-5">
      <SectionLabel>세션을 어떻게 뛰나요</SectionLabel>
      <p className="mt-1 text-label text-ink-muted">이 플랜에 나오는 훈련만 모았습니다.</p>

      <ul className="mt-4 space-y-4">
        {sessions.map(({ type, guide }) => (
          <li key={type} className="border-b border-line pb-4 last:border-b-0 last:pb-0">
            <p className="text-body-lg font-bold text-ink">{sessionTitle(type)}</p>
            <p className="mt-1 text-body leading-relaxed text-ink">{guide.how}</p>
            <p className="mt-1 text-label leading-relaxed text-ink-muted">{guide.check}</p>
          </li>
        ))}
      </ul>

      {terms.length > 0 ? (
        <div className="mt-4 space-y-2 border-t border-line pt-4">
          {terms.map((term) => (
            <Term key={term.term} term={term} />
          ))}
        </div>
      ) : null}
    </Card>
  );
}
