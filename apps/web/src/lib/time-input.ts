/**
 * 시간·페이스 입력 파싱. PRD §10.3 — 페이스·시간 입력은 mm:ss 마스크.
 *
 * 사용자는 콜론을 빼고 치기도 하고 ('4530'), 시간까지 넣기도 한다 ('1:55:00').
 * 전부 받아 준다. 입력에서 사람을 이기려 들 이유가 없다.
 */

/** '1:55:00' | '55:00' | '11500' → 초. 해석 불가면 null */
export function parseClock(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;

  if (value.includes(':')) {
    const parts = value.split(':').map((p) => p.trim());
    if (parts.some((p) => p === '' || !/^\d{1,2}$/.test(p))) return null;
    const nums = parts.map(Number);
    // 초는 60 미만, 시가 붙으면 분도 60 미만이어야 한다.
    // 분 단독은 '90:00'(90분) 같은 표기를 허용한다
    if (nums.length === 2) {
      if (nums[1]! > 59) return null;
      return nums[0]! * 60 + nums[1]!;
    }
    if (nums.length === 3) {
      if (nums[1]! > 59 || nums[2]! > 59) return null;
      return nums[0]! * 3600 + nums[1]! * 60 + nums[2]!;
    }
    return null;
  }

  if (!/^\d{3,6}$/.test(value)) return null;
  // 뒤에서 두 자리씩 초 → 분 → 시로 자른다
  const sec = Number(value.slice(-2));
  const min = Number(value.slice(-4, -2) || '0');
  const hour = Number(value.slice(0, -4) || '0');
  if (sec > 59 || min > 59) return null;
  return hour * 3600 + min * 60 + sec;
}

/** 입력 중인 문자열에 콜론을 끼워 넣는다 (표시용) */
export function maskClock(raw: string, withHours: boolean): string {
  const digits = raw.replace(/\D/g, '').slice(0, withHours ? 6 : 4);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, -2)}:${digits.slice(-2)}`;
  return `${digits.slice(0, -4)}:${digits.slice(-4, -2)}:${digits.slice(-2)}`;
}
