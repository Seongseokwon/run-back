import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SubHeader } from '@/components/layout/sub-header';
import { AppScreen } from '@/components/layout/app-screen';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/section';
import { HARD_DELETE_AFTER_DAYS } from '@runback/db';
import { withdrawAction } from '@/lib/account-actions';
import { currentUser } from '@/lib/session';
import { myRaces } from '@/lib/my-races';

/**
 * 회원 탈퇴 (F-18).
 *
 * **되묻는 단계를 늘리지 않는다.** §9.6 이 "탈퇴 절차는 가입만큼 쉬워야 한다
 * (다크패턴 금지)"로 못 박아 뒀다. 그래서 여기가 마지막 화면이고, 버튼을 누르면 끝난다.
 * "정말요?" 를 두 번 더 묻거나, 탈퇴 버튼을 회색으로 죽여 두거나,
 * 남는 혜택을 나열해 붙잡는 화면을 만들지 말 것.
 *
 * 대신 **무엇이 사라지는지는 정확히** 보여 준다. 그건 붙잡는 게 아니라 알려 주는 것이다.
 */
export const metadata: Metadata = { title: '회원 탈퇴', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function WithdrawPage() {
  const user = await currentUser();
  if (!user) redirect('/me');

  const races = await myRaces();

  return (
    <AppScreen header={<SubHeader title="회원 탈퇴" />}>
      <Screen>
        <section>
          <h1 className="text-title font-extrabold tracking-tight text-ink">
            정말 탈퇴하시겠어요?
          </h1>
          <p className="mt-3 text-body-lg text-ink-muted">
            탈퇴하면 아래 데이터가 모두 삭제되고 복구할 수 없습니다.
          </p>
        </section>

        <Card tone="sunken">
          <ul className="space-y-2 text-body-lg text-ink">
            <li>저장한 훈련 플랜 {races.length}개</li>
            <li>훈련 수행 기록 전부</li>
            <li>계정 정보</li>
          </ul>
        </Card>

        <section className="space-y-2">
          <p className="text-body text-ink-muted">
            탈퇴를 요청하면 <b className="text-ink">즉시 서비스 접근이 차단</b>되고,{' '}
            {HARD_DELETE_AFTER_DAYS}일 이내에 모든 데이터가 복구할 수 없도록 완전히 삭제됩니다.
          </p>
          <p className="text-body text-ink-muted">
            같은 계정으로 다시 가입하셔도 이전 데이터는 되살아나지 않습니다.
          </p>
          {/*
            연동 해제가 실패할 수 있다는 걸 숨기지 않는다 — 우리가 카카오 회원번호를
            해시로만 갖고 있어서 자동 해제가 늘 되지는 않는다 (lib/kakao-unlink.ts)
          */}
          {user.nickname === null ? (
            <p className="text-body text-ink-muted">
              카카오 연동은 자동으로 해제를 시도합니다. 해제되지 않으면 카카오 계정 설정 &gt;
              연결된 서비스에서 직접 끊을 수 있습니다.
            </p>
          ) : null}
        </section>

        {/* 주 동선은 '돌아가기'가 아니라 '탈퇴'다. 여기까지 온 사람의 의도를 뒤집지 않는다 */}
        <section className="space-y-3">
          <form
            action={async () => {
              'use server';
              await withdrawAction();
            }}
          >
            <Button type="submit" size="md" variant="outline">
              탈퇴하기
            </Button>
          </form>
          <ButtonLink href="/me" size="md" variant="ghost">
            돌아가기
          </ButtonLink>
        </section>
      </Screen>
    </AppScreen>
  );
}
