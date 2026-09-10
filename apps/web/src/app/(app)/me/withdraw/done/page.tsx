import type { Metadata } from 'next';
import { AppScreen } from '@/components/layout/app-screen';
import { SubHeader } from '@/components/layout/sub-header';
import { ButtonLink } from '@/components/ui/button';
import { Screen } from '@/components/ui/section';
import { HARD_DELETE_AFTER_DAYS } from '@runback/db';

/**
 * 탈퇴 완료. 로그아웃된 뒤에 도착하므로 세션이 없다.
 *
 * 여기서 재가입을 권하지 않는다 — 방금 떠나기로 한 사람에게 붙잡는 문구를 두는 것이
 * §9.6 이 금지한 다크패턴이다. 플랜은 로그인 없이도 만들 수 있다는 사실만 남긴다.
 */
export const metadata: Metadata = { title: '탈퇴 완료', robots: { index: false } };

export default function WithdrawDonePage() {
  return (
    <AppScreen header={<SubHeader title="탈퇴 완료" />}>
      <Screen>
        <section>
          <h1 className="text-title font-extrabold tracking-tight text-ink">
            탈퇴가 완료되었습니다.
          </h1>
          <p className="mt-3 text-body-lg text-ink-muted">
            서비스 접근이 차단되었고, {HARD_DELETE_AFTER_DAYS}일 이내에 모든 데이터가 완전히
            삭제됩니다. 그동안 이용해 주셔서 감사합니다.
          </p>
        </section>

        <ButtonLink href="/" size="md" variant="ghost">
          홈으로
        </ButtonLink>
      </Screen>
    </AppScreen>
  );
}
