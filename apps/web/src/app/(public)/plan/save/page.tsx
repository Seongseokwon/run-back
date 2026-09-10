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

type Props = { searchParams: Promise<{ p?: string; li?: string }> };

export default async function PlanSavePage({ searchParams }: Props) {
  const { p, li } = await searchParams;
  if (!p) redirect('/plan/new');

  const result = await savePlanAction(p);

  /*
   * §15 plan_saved / plan_migrated — 결과가 확정된 뒤에만 마커를 붙인다.
   * 이 화면에 도달하는 경로는 둘이다: 이미 로그인한 사람이 저장 버튼을 누른 경우와,
   * 게스트가 로그인을 거쳐 돌아온 경우(§9.5 전환). 뒤쪽에는 로그인 마커(li)가 함께 온다.
   */
  if (result.ok) {
    const migrated = typeof li === 'string' && li.length > 0;
    redirect(`/races?saved=${migrated ? 'migrated' : 'new'}`);
  }
  // 로그인이 안 됐거나 입력이 깨졌다. 어느 쪽이든 플랜을 보여 주는 화면으로 돌려보낸다
  redirect(`/plan/result?p=${p}`);
}
