import { Button, ButtonLink } from '@/components/ui/button';
import { savePlanAction } from '@/lib/plan-actions';
import { currentUserId } from '@/lib/session';
import { redirect } from 'next/navigation';

/**
 * 플랜 저장 버튼 (F-17) + 게스트→회원 전환 (§9.5).
 *
 * 로그인 상태면 바로 저장하고, 아니면 **플랜을 콜백 경로에 실어서** 로그인으로 보낸다.
 * 로그인이 끝나면 `/plan/save?p=...` 로 돌아와 저장이 이어진다.
 *
 * PRD §9.5 는 localStorage(pendingPlan)로 적어 뒀지만 콜백 경로에 싣는 편이 낫다 —
 * 사파리의 저장소 제한·시크릿 창·기기 전환에 영향을 받지 않고, 전환에 실패해도
 * 플랜은 여전히 URL 안에 있다(§9.5 가 원래 노린 성질). 클라이언트 자바스크립트도 필요 없다.
 *
 * §9.2 저장 게이트가 여기다. **생성이 아니라 저장에서 처음 로그인을 요구한다.**
 */
export async function SavePlanButton({ encoded }: { encoded: string }) {
  const userId = await currentUserId();

  if (!userId) {
    /*
     * 플랜을 **콜백 경로에 실어서** 로그인으로 보낸다.
     *
     * 한때 `signIn(undefined, { redirectTo })` 를 썼는데, 그러면 Auth.js 가 로그인 화면으로
     * 보내면서 callbackUrl 을 쿼리에 다는 것까지는 맞지만 **그 화면이 값을 읽지 않으면
     * 그대로 버려진다.** 실제로 로그인 뒤 플랜이 사라지고 있었다.
     * 지금은 /login 이 callbackUrl 을 받아 두 제공자 모두에 전달한다 (§9.5).
     */
    const callbackUrl = encodeURIComponent(`/plan/save?p=${encoded}`);
    return (
      <div>
        <ButtonLink href={`/login?callbackUrl=${callbackUrl}`} size="md" variant="outline">
          로그인하고 이 플랜 저장하기
        </ButtonLink>
        <p className="mt-2 text-center text-label text-ink-muted">
          로그인하지 않아도 아래 링크를 복사해 두면 언제든 다시 열 수 있습니다
        </p>
      </div>
    );
  }

  return (
    <form
      action={async () => {
        'use server';
        const result = await savePlanAction(encoded);
        if (result.ok) redirect('/races');
      }}
    >
      <Button type="submit" size="md" variant="outline">
        내 대회에 저장하기
      </Button>
    </form>
  );
}
