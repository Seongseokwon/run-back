/**
 * 대회 데이터 타입 — PRD §8 Race 를 기반으로 하되 운영 현실을 반영해 확장했다.
 *
 * PRD 대비 추가된 필드와 이유
 *  - `confidence` : 날짜·장소를 어느 수준의 출처로 확인했는지. §17 R5(대회 정보 오류 → 신뢰 붕괴)
 *    대응이다. 잘못된 날짜는 곧 잘못된 플랜이므로, 확신도를 데이터에 박아 두고
 *    낮은 것부터 사람이 점검한다
 *  - `status`     : 개최 자체가 불투명한 대회가 실제로 존재한다 (주최사 사정 등)
 *  - `officialUrl`: 출처(`sourceUrl`)와 공식 사이트는 다를 수 있다. 사용자에게 보여줄 건 후자다
 */

/** 코스 고저 특성 */
export type CourseProfile = 'flat' | 'rolling' | 'hilly';

/** 날짜·장소 정보의 확인 수준 */
export type RaceConfidence =
  /** 공식 사이트 또는 주최사 발표로 직접 확인 */
  | 'high'
  /** 복수의 일정 취합 사이트에서 교차 확인 */
  | 'medium'
  /** 단일 2차 출처. 사람이 반드시 점검할 것 */
  | 'low';

export type RaceStatus =
  | 'scheduled'
  /** 개최 여부가 불투명. UI 에서 경고를 띄우고 목표 대회로 권하지 않는다 */
  | 'uncertain';

export type Race = {
  /** URL 세그먼트. 소문자 영숫자와 하이픈만 */
  slug: string;
  nameKo: string;
  /** ISO date (KST) */
  date: string;
  /** '강원 춘천' 형태 */
  region: string;
  /** 운영 종목 (km). 오름차순 */
  distances: number[];
  officialUrl?: string;
  registrationUrl?: string;

  // ── SEO 차별화 필드 (§12, §13.2) ──
  // 이 중 하나라도 없으면 정적 페이지를 만들지 않는다. 템플릿에 숫자만 바꾼
  // 페이지는 저품질 대량생성으로 판정될 수 있고, 그러면 사이트 전체가 죽는다
  courseProfile?: CourseProfile;
  courseNote?: string;
  weatherNote?: string;

  /** 최장 종목 제한시간 (시간) */
  cutoffHours?: number;

  status: RaceStatus;
  /** status 가 scheduled 가 아닐 때 사용자에게 보여줄 설명 */
  statusNote?: string;
  confidence: RaceConfidence;
  /** 날짜·종목을 확인한 출처 */
  sourceUrl: string;
  /** 최종 확인일 (ISO date). 각 대회 페이지에 노출한다 (§12) */
  updatedAt: string;
};

/** 엔진이 다루는 표준 대회 거리 (km) */
export const STANDARD_DISTANCES_KM = [5, 10, 21.0975, 42.195] as const;
