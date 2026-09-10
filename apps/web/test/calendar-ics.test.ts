import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePlan } from '@runback/engine';
import { planToIcs } from '../src/lib/calendar-ics.ts';

/**
 * .ics 는 사용자의 캘린더 앱이 읽는다. 우리 화면과 달리 **틀리면 조용히 통째로 거부**되거나
 * 일정이 중복 생성된다. 그래서 포맷 규칙을 테스트로 못 박는다.
 */

const plan = generatePlan({
  raceDate: '2026-11-15',
  raceDistanceM: 21097.5,
  today: '2026-09-07',
  fitness: { kind: 'race', distanceM: 10000, timeSec: 50 * 60 },
  goal: { kind: 'time', targetSec: 115 * 60 },
  daysPerWeek: 4,
  currentWeeklyKm: 30,
});

const ics = planToIcs(plan, { calendarName: '2026 MBN 서울마라톤', planKey: 'plan-1' });
const lines = ics.split('\r\n');

describe('iCalendar 뼈대', () => {
  test('VCALENDAR 로 열고 닫는다', () => {
    assert.equal(lines[0], 'BEGIN:VCALENDAR');
    assert.equal(lines.at(-2), 'END:VCALENDAR');
  });

  test('줄 끝이 CRLF 다 — LF 만 쓰면 거부하는 캘린더가 있다', () => {
    assert.ok(ics.endsWith('\r\n'));
    // \r 없는 \n 이 하나도 없어야 한다 (접힌 줄 포함)
    assert.equal(/(?<!\r)\n/.test(ics), false);
  });

  test('세션 수만큼 VEVENT 가 있고 휴식일은 빠진다', () => {
    const events = lines.filter((l) => l === 'BEGIN:VEVENT').length;
    const sessions = plan.weeks.flatMap((w) => w.sessions).filter((s) => s.type !== 'rest');
    assert.equal(events, sessions.length);
    assert.ok(events > 0);
  });
});

describe('종일 일정', () => {
  test('DTSTART 는 DATE 값이고 DTEND 는 다음 날이다', () => {
    const start = lines.find((l) => l.startsWith('DTSTART'))!;
    const end = lines.find((l) => l.startsWith('DTEND'))!;
    assert.match(start, /^DTSTART;VALUE=DATE:\d{8}$/);
    assert.match(end, /^DTEND;VALUE=DATE:\d{8}$/);

    const s = Number(start.split(':')[1]);
    const e = Number(end.split(':')[1]);
    assert.ok(e > s, '끝이 시작보다 뒤여야 한다');
  });

  test('월말을 넘어가는 날짜도 다음 날로 정확히 넘어간다', () => {
    const p = generatePlan({
      raceDate: '2026-11-15',
      raceDistanceM: 21097.5,
      today: '2026-09-28',
      fitness: { kind: 'feel', easyPaceSecPerKm: 360, weeklyKm: 30 },
      goal: { kind: 'finish' },
      daysPerWeek: 4,
    });
    const out = planToIcs(p, { calendarName: 'x', planKey: 'k' });
    const pairs = out
      .split('\r\n')
      .filter((l) => l.startsWith('DTSTART') || l.startsWith('DTEND'))
      .map((l) => l.split(':')[1]!);

    for (let i = 0; i < pairs.length; i += 2) {
      const start = new Date(
        `${pairs[i]!.slice(0, 4)}-${pairs[i]!.slice(4, 6)}-${pairs[i]!.slice(6, 8)}T00:00:00Z`,
      );
      const end = new Date(
        `${pairs[i + 1]!.slice(0, 4)}-${pairs[i + 1]!.slice(4, 6)}-${pairs[i + 1]!.slice(6, 8)}T00:00:00Z`,
      );
      assert.equal(end.getTime() - start.getTime(), 86_400_000, `${pairs[i]} → ${pairs[i + 1]}`);
    }
  });
});

describe('UID — 다시 받아도 일정이 늘지 않는다', () => {
  test('같은 플랜·같은 키면 UID 가 같다', () => {
    const again = planToIcs(plan, { calendarName: '다른 이름', planKey: 'plan-1' });
    const uids = (s: string): string[] => s.split('\r\n').filter((l) => l.startsWith('UID:'));
    assert.deepEqual(uids(again), uids(ics));
  });

  test('플랜 키가 다르면 UID 도 다르다', () => {
    const other = planToIcs(plan, { calendarName: 'x', planKey: 'plan-2' });
    const first = (s: string): string => s.split('\r\n').find((l) => l.startsWith('UID:'))!;
    assert.notEqual(first(other), first(ics));
  });

  test('UID 가 하루에 하나씩만 있다 — 중복 생성의 원인', () => {
    const uids = lines.filter((l) => l.startsWith('UID:'));
    assert.equal(new Set(uids).size, uids.length);
  });
});

describe('결정론 (§4.2)', () => {
  test('같은 플랜을 두 번 내보내면 바이트까지 같다', () => {
    const a = planToIcs(plan, { calendarName: 'n', planKey: 'k' });
    const b = planToIcs(plan, { calendarName: 'n', planKey: 'k' });
    assert.equal(a, b);
  });
});

describe('RFC 5545 텍스트 규칙', () => {
  test('한 줄이 75 옥텟을 넘지 않는다 — 글자 수가 아니라 바이트다', () => {
    for (const line of ics.split('\r\n')) {
      const bytes = new TextEncoder().encode(line).length;
      assert.ok(bytes <= 75, `${bytes} 옥텟: ${line.slice(0, 40)}…`);
    }
  });

  test('접힌 줄은 공백으로 시작한다', () => {
    // 접기가 실제로 일어났는지도 함께 본다 (한글 설명이 길어 반드시 접힌다)
    const folded = ics.split('\r\n').filter((l) => l.startsWith(' '));
    assert.ok(folded.length > 0, '접힌 줄이 하나도 없다 — 접기 로직이 안 돌았다');
  });

  test('멀티바이트 문자가 잘리지 않는다', () => {
    // 접힌 줄을 되붙이면 원래 문자열이 복원돼야 한다
    const unfolded = ics.replaceAll('\r\n ', '');
    assert.equal(unfolded.includes('�'), false, '깨진 문자가 있다');
    assert.ok(unfolded.includes('SUMMARY:'));
  });

  test('쉼표·세미콜론·역슬래시를 이스케이프한다', () => {
    const p = generatePlan({
      raceDate: '2026-11-15',
      raceDistanceM: 42195,
      today: '2026-06-01',
      fitness: { kind: 'race', distanceM: 21097.5, timeSec: 110 * 60 },
      goal: { kind: 'time', targetSec: 4 * 3600 },
      daysPerWeek: 5,
      currentWeeklyKm: 40,
    });
    const out = planToIcs(p, { calendarName: 'a,b;c\\d', planKey: 'k' });
    const name = out.split('\r\n').find((l) => l.startsWith('X-WR-CALNAME'))!;
    assert.equal(name, 'X-WR-CALNAME:a\\,b\\;c\\\\d');
  });
});
