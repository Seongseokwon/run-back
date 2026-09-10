'use client';

import { useState } from 'react';
import type { PlanWeek } from '@runback/engine';
import { Badge, ZoneBadge } from '@/components/ui/badge';

const PHASE_LABEL = { base: '기반', build: '빌드', peak: '피크', taper: '테이퍼' } as const;
const DOW = ['일', '월', '화', '수', '목', '금', '토'];

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * 주차 리스트 — PRD §10.5. 아코디언, 현재 주차 자동 펼침.
 * ACWR 클램프가 걸린 주차는 배지로 알린다 — 조용히 줄이지 않는다 (§7.10).
 *
 * 각 줄에 주간 거리를 막대로도 그린다. 이 제품이 파는 건 '주차별 계획'이 아니라
 * **역산된 곡선**인데, 숫자만 세로로 쌓아서는 기반→빌드→피크→테이퍼가 눈에 안 들어온다.
 */
export function WeekAccordion({ weeks, today }: { weeks: PlanWeek[]; today: string }) {
  const currentIndex = weeks.findIndex((w) => today >= w.startDate && today <= addDays(w.startDate, 6));
  const [open, setOpen] = useState<number>(currentIndex >= 0 ? currentIndex : 0);
  const peakKm = Math.max(1, ...weeks.map((w) => w.totalKm));

  return (
    <div className="space-y-2">
      {weeks.map((week) => {
        const expanded = open === week.index;
        const isCurrent = week.index === currentIndex;
        const isPast = today > addDays(week.startDate, 6);

        return (
          <div
            key={week.index}
            className={`overflow-hidden rounded-card border bg-surface ${
              isCurrent ? 'border-brand shadow-lifted' : 'border-line'
            }`}
          >
            <button
              type="button"
              onClick={() => setOpen(expanded ? -1 : week.index)}
              aria-expanded={expanded}
              className="pressable w-full px-4 py-3 text-left hover:bg-surface-sunken/40"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-12 shrink-0 text-body font-extrabold ${
                    isPast ? 'text-ink-muted' : 'text-ink'
                  }`}
                >
                  {week.index + 1}주차
                </span>
                <Badge tone={isCurrent ? 'brand' : 'neutral'}>{PHASE_LABEL[week.phase]}</Badge>
                {week.clamped ? (
                  <span title="안전한 증가 폭을 넘어 거리를 줄인 주차입니다">
                    <Badge tone="outline">조정됨</Badge>
                  </span>
                ) : null}
                <span className="tabular ml-auto text-body font-bold text-ink">
                  {week.totalKm}
                  <span className="ml-0.5 text-label font-semibold text-ink-muted">km</span>
                </span>
                <svg
                  viewBox="0 0 20 20"
                  className={`size-4 shrink-0 text-ink-subtle transition-transform ${expanded ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path d="M7 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {/* 볼륨 곡선. 장식이라 스크린리더에서는 숨긴다 — 같은 값이 바로 위에 숫자로 있다 */}
              <span aria-hidden className="mt-2 block h-1.5 w-full rounded-full bg-surface-sunken">
                <span
                  className={`block h-full rounded-full ${isCurrent ? 'bg-brand' : isPast ? 'bg-brand-line' : 'bg-brand-soft'}`}
                  style={{ width: `${Math.round((week.totalKm / peakKm) * 100)}%` }}
                />
              </span>
            </button>

            {expanded ? (
              <div className="border-t border-line px-4 py-2">
                {Array.from({ length: 7 }, (_, i) => {
                  const date = addDays(week.startDate, i);
                  const session = week.sessions.find((s) => s.date === date);
                  const dow = DOW[new Date(`${date}T00:00:00Z`).getUTCDay()];
                  return (
                    <div
                      key={date}
                      className="flex items-start gap-2.5 border-b border-line py-2.5 last:border-b-0"
                    >
                      <span className="w-5 shrink-0 pt-0.5 text-label font-bold text-ink-muted">{dow}</span>
                      {session ? (
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-body text-ink">
                            <span className="tabular font-bold">{session.distanceKm}km</span>
                            <ZoneBadge zone={session.targetZone} />
                            <span className="tabular text-ink-muted">{session.durationMin}분</span>
                          </p>
                          {session.structure ? (
                            <p className="mt-0.5 text-label text-ink-muted">{session.structure}</p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="flex-1 text-body text-ink-muted">휴식</span>
                      )}
                    </div>
                  );
                })}
                {week.clamped ? (
                  <p className="py-3 text-label text-ink-muted">
                    안전한 훈련량 증가 폭(ACWR 1.3)을 넘어서 이 주차의 거리를 줄였습니다.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
