import type { ReactNode } from 'react';
import { SectionLabel } from '@/components/ui/card';
import { BigStat } from '@/components/ui/stat';
import { SceneSurface } from '@/components/ui/scene';
import type { IllustrationName } from '@/lib/illustrations';

/**
 * 오늘 할 세션 하나. 러너가 이 화면에서 얻어 갈 정보는 결국 이것뿐이다.
 *
 * 씬은 세션 종류마다 바뀐다 — 이지런과 인터벌이 같은 그림이면 그림이 정보를 주지 않는다.
 * 글자를 읽기 전에 오늘이 어떤 날인지 알게 하는 게 이 그림의 역할이다.
 *
 * 두 모양이 있다.
 *  - `flush`  홈. 테두리 없이 캔버스에 놓인다. 위의 대회 카드와 경쟁하지 않게
 *  - `card`   훈련 일정 상세. 이 화면의 주인공이라 테두리와 그림자로 띄운다
 *
 * 버튼은 그림 밖 흰 바닥에 앉힌다 — 씬 위에 얹으면 러너와 길을 정확히 덮는다.
 */
export function TodayTrainingCard({
  label,
  typeLabel,
  distanceKm,
  paceRange,
  illustration,
  note,
  action,
  variant = 'flush',
}: {
  /** TODAY'S TRAINING / 오늘의 훈련 */
  label: string;
  /** EASY RUN, TEMPO … */
  typeLabel: string;
  distanceKm: number;
  /** '6:40 ~ 7:10' */
  paceRange: string;
  illustration: IllustrationName;
  note?: string;
  /** 그림 아래 흰 바닥에 들어가는 버튼 (훈련 기록하기) */
  action?: ReactNode;
  variant?: 'flush' | 'card';
}) {
  return (
    <div
      className={`overflow-hidden rounded-card ${
        variant === 'card'
          ? 'border border-line bg-surface-raised shadow-lifted'
          : 'border border-line bg-surface'
      }`}
    >
      <SceneSurface name={illustration} minHeight={280}>
        <div className="px-5 pt-5">
          <SectionLabel>{label}</SectionLabel>
          <h3 className="mt-1.5 truncate text-card font-extrabold tracking-tight text-ink uppercase">
            {typeLabel}
          </h3>
          <div className="mt-1">
            <BigStat value={distanceKm.toFixed(1)} unit="KM" size="lg" />
          </div>

          <p className="mt-2.5 flex flex-wrap items-center gap-x-2 text-body-lg text-ink">
            <svg
              viewBox="0 0 24 24"
              className="size-5 shrink-0 text-accent"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-semibold text-ink-muted">목표 페이스</span>
            <span className="tabular font-bold">{paceRange}</span>
            <span className="text-ink-muted">/km</span>
          </p>
        </div>
      </SceneSurface>

      {note || action ? (
        <div className="border-t border-line px-5 py-4">
          {note ? <p className="text-label text-ink-muted">{note}</p> : null}
          {action ? <div className={note ? 'mt-3' : ''}>{action}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
