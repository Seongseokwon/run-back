import type { Metadata } from 'next';
import { findRace } from '@raceback/races';
import { Card } from '@/components/ui/card';
import { formatRaceDate } from '@/lib/format';
import { distanceLabel } from '@/lib/format';

export const metadata: Metadata = { title: '플랜 만들기' };

/**
 * 입력 스텝 — PRD §10.3. 3스텝 progressive disclosure, 스텝당 질문 2개 이하.
 *
 * 지금은 구조만 잡혀 있다. 실제 입력 위젯(F-01~03)은 클라이언트 컴포넌트로 붙인다.
 *  - 숫자 입력은 전부 inputmode="numeric"
 *  - 페이스·시간은 mm:ss 마스크
 *  - 뒤로 가기 시 입력 보존
 */
const STEPS = [
  { n: 1, title: '어느 대회인가요?', hint: '대회를 고르거나 날짜를 직접 입력합니다', todo: 'F-01 대회 검색 자동완성 + 날짜 직접 입력 폴백' },
  { n: 2, title: '지금 실력이 어느 정도인가요?', hint: '최근 기록 / 편한 페이스 / 잘 모름 중 하나만 답하면 됩니다', todo: 'F-02 3분기 선택 후 해당 입력만 노출' },
  { n: 3, title: '목표와 훈련 가능 일수', hint: '목표 기록 또는 완주, 그리고 주 3~6일', todo: 'F-03 목표 시간 마스크 입력 + 일수 선택' },
] as const;

type Props = { searchParams: Promise<{ race?: string; distance?: string }> };

export default async function PlanNewPage({ searchParams }: Props) {
  const { race: raceSlug, distance } = await searchParams;
  const race = raceSlug ? findRace(raceSlug) : undefined;

  return (
    <div className="space-y-6 pt-2">
      <h1 className="text-[28px] font-extrabold tracking-tight text-ink">플랜 만들기</h1>

      {/* 대회 페이지에서 넘어오면 스텝 1을 건너뛴다 (§10.3) */}
      {race ? (
        <Card className="px-5 py-4">
          <p className="text-[13px] font-bold text-brand">선택한 대회</p>
          <p className="mt-1 text-[17px] font-bold text-ink">{race.nameKo}</p>
          <p className="mt-0.5 text-[14px] text-ink-muted">
            {formatRaceDate(race.date)}
            {distance ? ` · ${distanceLabel(Number(distance))}` : ''}
          </p>
        </Card>
      ) : null}

      <ol className="space-y-3">
        {STEPS.map((step) => (
          <li key={step.n}>
            <Card className="px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-brand-soft text-[13px] font-bold text-brand">
                  {step.n}
                </span>
                <h2 className="text-[17px] font-bold text-ink">{step.title}</h2>
              </div>
              <p className="mt-1.5 text-[14px] text-ink-muted">{step.hint}</p>
              <p className="mt-3 rounded-lg border border-dashed border-line-strong px-3 py-2 text-[12px] text-ink-faint">
                TODO · {step.todo}
              </p>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
