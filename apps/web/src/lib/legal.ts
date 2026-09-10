/**
 * 법적 고지에 들어가는 신원 정보. 여기 넣는 값은 전부 공개 웹에 노출된다.
 *
 * O8 해결 (PRD v1.2): 개인정보보호법 제30조 제1항은 보호책임자의
 * "성명 **또는** 개인정보 보호업무 및 관련 고충사항을 처리하는 부서의 명칭과
 * 전화번호 등 연락처"를 요구한다. 성명이 아니어도 되므로 닉네임으로 표기한다.
 * 상시 근로자 5명 미만이라 별도 지정 의무도 없고 운영자 본인이 보호책임자가 된다.
 *
 * O9 해결 (PRD v1.2): 카카오 로그인 단독 + 회원번호만 수집이면 비즈앱 심사 대상이
 * 아니므로 사업자등록증을 제출할 일이 없다. 등록 전까지 사업자번호는 표기하지 않는다.
 *
 * O1' 해결 (2026-09-10): 도메인 runback.kr 확정 → privacy@runback.kr.
 *
 * ⚠️ 남은 것: 시행일. 방침이 효력을 갖는 날 = 실제로 개인정보 처리를 시작하는 날
 *    = 카카오 로그인을 켜는 날이다. 배포 날짜가 잡히면 채운다.
 *    그때까지 hasUnresolvedLegalInfo() 가 true 로 남아 "아직 인증을 켜면 안 된다"를 알린다.
 */

export const LEGAL = {
  /** 서비스 운영 주체 표기 */
  operatorName: 'sseong',
  /** 개인정보 보호책임자 (개인정보보호법 제31조) */
  /** 실명 대신 닉네임. 법 제30조가 '성명 또는 부서 명칭'을 허용한다 (PRD O8) */
  privacyOfficerName: 'sseong',
  /** ⚠️ 생략 불가. 조문이 '명칭과 연락처'라 세트로만 성립한다.
   *  실제로 메일을 받아야 한다 — 반송되는 주소는 연락처를 적지 않은 것과 다르지 않다 */
  privacyOfficerContact: 'privacy@runback.kr',
  /** 사업자 등록을 했다면 채운다. 없으면 null 로 두고 표기하지 않는다 */
  businessNumber: null as string | null,
  /** 방침 시행일 — 인증을 켜는 날. 그전까지 방침은 공개 가능 상태가 아니다 */
  effectiveDate: 'TODO_YYYY-MM-DD',
  /** 직전 개정일. 최초 제정이면 null */
  previousDate: null as string | null,
} as const;

/** 신원 정보가 아직 플레이스홀더인지 — 배포 전 점검에 쓴다 */
export function hasUnresolvedLegalInfo(): boolean {
  return Object.values(LEGAL).some((v) => typeof v === 'string' && v.startsWith('TODO_'));
}
