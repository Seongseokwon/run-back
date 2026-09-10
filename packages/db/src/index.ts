/**
 * @runback/db — 계정·저장 플랜·수행 기록 저장소.
 *
 * 경계 하나만 기억하면 된다: **이 패키지는 엔진을 모르고, 엔진은 이 패키지를 모른다.**
 * 엔진은 런타임 의존성 0 이 계약이고(tsconfig.purity.json 이 강제한다),
 * 저장소는 PlanInput 을 JSON 으로 넣고 꺼낼 뿐 플랜을 만들지 않는다.
 * 둘을 잇는 건 웹 어댑터(apps/web/src/lib/my-races.ts)다.
 */

export { prisma } from './client.ts';
export * from './users.ts';
export * from './plans.ts';
export * from './logs.ts';
