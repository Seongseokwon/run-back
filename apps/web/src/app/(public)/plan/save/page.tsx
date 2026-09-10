import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { savePlanAction } from '@/lib/plan-actions';

/**
 * 로그인 직후 저장이 이어지는 자리 (§9.5).
 *
 * 여기는 **링크로 걸지 않는다.** 로그인 리다이렉트만 도착한다.
 * 그래서 프리페치가 이 경로를 건드릴 일이 없고, 설사 두 번 들어와도
 * savePlan() 이 멱등이라 플랜이 두 번 생기지 않는다.
 *
 * 저장에 실패해도 플랜은 잃지 않는다 — `p` 를 들고 결과 화면으로 되돌린다.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ p?: string }> };

export default async function PlanSavePage({ searchParams }: Props) {
  const { p } = await searchParams;
  if (!p) redirect('/plan/new');

  const result = await savePlanAction(p);

  if (result.ok) redirect('/races');
  // 로그인이 안 됐거나 입력이 깨졌다. 어느 쪽이든 플랜을 보여 주는 화면으로 돌려보낸다
  redirect(`/plan/result?p=${p}`);
}
