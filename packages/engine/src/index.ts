/**
 * @raceback/engine — 대회 역산 훈련 플랜 엔진
 *
 * 원칙 (PRD §7, §11.2)
 *  - 순수 함수만. I/O 없음, 런타임 의존성 없음
 *  - 같은 입력 → 항상 같은 출력 (결정론). 정적 SEO 페이지 대량 생성이 이 성질에 의존한다
 *  - 예측은 단일 숫자가 아니라 범위로 반환
 *
 * W1 범위: VDOT 코어 / 거리 환산 / 페이스표
 * W2 예정: 타당성 판정, 페이즈 배분, ACWR 볼륨 곡선, 세션 배치
 */

export * from './units.ts';
export * from './daniels.ts';
export * from './riegel.ts';
export * from './zones.ts';
export * from './fitness.ts';
export * from './types.ts';
