'use client';

import { useState } from 'react';
import type { PlanWeek } from '@raceback/engine';

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
 */
export function WeekAccordion({ weeks, today }: { weeks: PlanWeek[]; today: string }) {
  const currentIndex =
    weeks.findIndex((w) => today >= w.startDate && today <= addDays(w.startDate, 6)) ?? 0;
  const [open, setOpen] = useState<number>(currentIndex >= 0 ? currentIndex : 0);

  return (
    <div className="space-y-2">
      {weeks.map((week) => {
        const expanded = open === week.index;
        return (
          <div key={week.index} className="overflow-hidden rounded-card border border-line bg-surface">
            <button
              type="button"
              onClick={() => setOpen(expanded ? -1 : week.index)}
              aria-expanded={expanded}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className="w-11 shrink-0 text-[15px] font-bold text-ink">{week.index + 1}주차</span>
              <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[12px] font-semibold text-ink-muted">
                {PHASE_LABEL[week.phase]}
              </span>
              {week.clamped ? (
                <span
                  className="rounded-full bg-brand-soft px-2 py-0.5 text-[12px] font-semibold text-brand"
                  title="안전한 증가 폭을 넘어 거리를 줄인 주차입니다"
                >
                  조정됨
                </span>
              ) : null}
              <span className="tabular ml-auto text-[15px] font-bold text-ink">{week.totalKm}km</span>
              <svg
                viewBox="0 0 20 20"
                className={`size-4 shrink-0 text-ink-faint transition-transform ${expanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M7 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {expanded ? (
              <div className="border-t border-line px-4 py-2">
                {Array.from({ length: 7 }, (_, i) => {
                  const date = addDays(week.startDate, i);
                  const session = week.sessions.find((s) => s.date === date);
                  const dow = DOW[new Date(`${date}T00:00:00Z`).getUTCDay()];
                  return (
                    <div key={date} className="flex items-start gap-3 border-b border-line py-2.5 last:border-b-0">
                      <span className="w-5 shrink-0 pt-0.5 text-[14px] font-semibold text-ink-muted">{dow}</span>
                      {session ? (
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] text-ink">
                            <span className="font-semibold">{session.distanceKm}km</span>
                            <span className="ml-2 text-ink-muted">
                              {session.targetZone} · {session.durationMin}분
                            </span>
                          </p>
                          {session.structure ? (
                            <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{session.structure}</p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="flex-1 text-[15px] text-ink-faint">휴식</span>
                      )}
                    </div>
                  );
                })}
                {week.clamped ? (
                  <p className="py-3 text-[13px] leading-relaxed text-ink-muted">
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
