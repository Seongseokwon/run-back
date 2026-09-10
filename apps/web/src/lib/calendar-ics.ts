/**
 * 훈련 플랜 → iCalendar (.ics) — F-11
 *
 * **왜 이걸 만드나.** 이 제품의 North Star 는 D+7 재방문인데(§3.2), 캘린더는
 * **사용자가 앱을 열지 않아도 먼저 말을 건다.** PRD 도 P1 중 유일하게 "우선 검토"로
 * 지목한 항목이다.
 *
 * 라이브러리를 쓰지 않는다. iCalendar 는 텍스트 포맷이고 우리가 쓰는 범위는 좁다.
 * 대신 RFC 5545 의 까다로운 세 가지를 정확히 지킨다 — 아래 함수 주석 참조.
 */

import type { Plan, PlanSession } from '@runback/engine';
import { SITE_NAME, SITE_URL } from './config.ts';
import { sessionTitle } from './plan-view.ts';

/**
 * TEXT 값 이스케이프 (RFC 5545 §3.3.11).
 * 백슬래시를 **가장 먼저** 바꾼다 — 나중에 하면 우리가 넣은 이스케이프를 또 이스케이프한다.
 */
function escapeText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll(/\r?\n/g, '\\n');
}

/**
 * 줄 접기 (RFC 5545 §3.1). 한 줄은 **75 옥텟**을 넘을 수 없다.
 *
 * ⚠️ 글자 수가 아니라 **바이트 수**다. 한글은 UTF-8 로 3바이트라 글자 수로 세면
 * 캘린더 앱이 줄을 잘못 읽는다. 그리고 멀티바이트 문자 **중간에서 자르면 안 된다** —
 * 깨진 바이트가 나온다. 그래서 코드포인트 단위로 누적하며 옥텟을 센다.
 */
function foldLine(line: string): string {
  const LIMIT = 75;
  const out: string[] = [];
  let current = '';
  let bytes = 0;

  for (const ch of line) {
    const size = new TextEncoder().encode(ch).length;
    // 이어지는 줄은 맨 앞 공백 1옥텟을 먹는다
    const limit = out.length === 0 ? LIMIT : LIMIT - 1;
    if (bytes + size > limit) {
      out.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);

  return out.join('\r\n ');
}

/** `2026-09-14` → `20260914` */
function toIcsDate(iso: string): string {
  return iso.replaceAll('-', '');
}

/** 하루 뒤. 종일 일정의 DTEND 는 **다음 날**이다 (끝이 열린 구간) */
function nextDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return toIcsDate(d.toISOString().slice(0, 10));
}

function summaryFor(session: PlanSession): string {
  if (session.type === 'race') return `🏁 ${SITE_NAME} 대회 당일`;
  return `${sessionTitle(session.type)} ${session.distanceKm}km`;
}

function descriptionFor(session: PlanSession, plan: Plan): string {
  const pace = plan.paces[session.targetZone];
  const lines = [
    session.structure ?? `${session.distanceKm}km · 약 ${session.durationMin}분`,
    `목표 페이스 ${formatPace(pace.fastSecPerKm)} ~ ${formatPace(pace.slowSecPerKm)} /km`,
  ];
  return lines.join('\n');
}

function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export type IcsOptions = {
  /** 캘린더 이름. 대회 이름을 넣으면 사용자가 캘린더 목록에서 구분한다 */
  calendarName: string;
  /**
   * UID 를 안정적으로 만드는 값. 같은 플랜을 다시 내보내면 **일정이 늘지 않고 갱신**된다.
   * 저장된 플랜이면 planId, 게스트면 인코딩된 입력을 쓴다.
   */
  planKey: string;
};

/**
 * 알람(VALARM)을 넣지 않는다.
 *
 * 넣으면 재방문 유도에는 분명 도움이 되지만, **남의 캘린더에 알림을 심는 일**이다.
 * 대부분의 캘린더 앱이 종일 일정에 자체 알림 설정을 이미 갖고 있고, 원치 않는 알림은
 * 캘린더를 통째로 지우게 만든다. 사용자가 고르게 두는 편이 낫다.
 */
export function planToIcs(plan: Plan, options: IcsOptions): string {
  const sessions = plan.weeks
    .flatMap((w) => w.sessions)
    .filter((s) => s.type !== 'rest')
    .sort((a, b) => a.date.localeCompare(b.date));

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${SITE_NAME}//Training Plan//KO`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(options.calendarName)}`,
    'X-WR-TIMEZONE:Asia/Seoul',
  ];

  for (const session of sessions) {
    lines.push(
      'BEGIN:VEVENT',
      // 같은 플랜을 다시 받아도 일정이 중복되지 않게 하는 핵심
      `UID:${session.date}-${options.planKey}@runback.kr`,
      /*
       * DTSTAMP 를 '지금'으로 찍지 않는다. 그러면 같은 플랜을 두 번 내보낼 때마다
       * 파일이 달라져서 **결정론(§4.2)이 깨지고** 캐시·비교가 무의미해진다.
       * 플랜이 만들어진 날을 쓴다.
       */
      `DTSTAMP:${toIcsDate(plan.input.today)}T000000Z`,
      `DTSTART;VALUE=DATE:${toIcsDate(session.date)}`,
      `DTEND;VALUE=DATE:${nextDay(session.date)}`,
      `SUMMARY:${escapeText(summaryFor(session))}`,
      `DESCRIPTION:${escapeText(descriptionFor(session, plan))}`,
      `URL:${SITE_URL}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');

  // RFC 5545 는 CRLF 를 요구한다. LF 만 쓰면 일부 캘린더가 파일 전체를 거부한다
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
