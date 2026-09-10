'use client';

import { track } from '@/lib/analytics';
import { EVENTS } from '@/lib/analytics-events';

/**
 * 캘린더에 훈련 일정 추가 (F-11).
 *
 * `<a download>` 이 아니라 그냥 링크다 — 서버가 `Content-Disposition: attachment` 를
 * 붙여 주고, iOS 는 `.ics` 를 **다운로드가 아니라 캘린더 앱으로** 넘겨야 한다.
 * `download` 속성을 붙이면 그 동작을 막는다.
 *
 * 계측은 클릭 시점에 쏜다 (§15 `plan_saved{method:'calendar'}`). 파일 응답이라
 * 도착 화면이 없어서 결과를 확인할 자리가 없다 — 이 이벤트는 '눌렀다'를 센다.
 */
export function CalendarExportButton({ href }: { href: string }) {
  return (
    <div>
      <a
        href={href}
        onClick={() => track(EVENTS.planSaved, { method: 'calendar' })}
        className="pressable flex h-12 w-full items-center justify-center gap-2 rounded-control border border-line-strong bg-surface text-body font-bold text-ink"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          aria-hidden
        >
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
        </svg>
        캘린더에 훈련 일정 추가
      </a>
      <p className="mt-2 text-center text-label text-ink-muted">
        휴식일을 뺀 모든 훈련이 종일 일정으로 들어갑니다. 알림은 캘린더 앱에서 직접 설정하세요
      </p>
    </div>
  );
}
