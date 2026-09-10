import type { Metadata } from 'next';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import {
  KakaoSignInButton,
  PasswordLoginSection,
} from '@/components/auth/auth-buttons';
import { safeCallbackUrl } from '@/lib/safe-redirect';
import { currentUserId } from '@/lib/session';
import { TrackEvent } from '@/components/analytics/track-event';
import { EVENTS } from '@/lib/analytics-events';

/**
 * 로그인 (F-16).
 *
 * **왜 전용 화면인가.** 예전엔 '나' 탭이 로그인 화면을 겸했는데 두 가지가 어긋났다.
 *  - 설정 목록 한가운데에 카카오 버튼과 이메일 폼이 같은 무게로 서서, 무엇이 주 경로인지 안 읽혔다
 *  - 저장 버튼에서 넘어온 `callbackUrl` 을 받아 줄 자리가 없어서 **로그인 뒤 플랜이 사라졌다**
 *    (§9.5 게스트→회원 전환). 이 화면이 그 값을 받아 두 제공자 모두에 전달한다.
 *
 * (public) 레이아웃이라 하단 탭바가 없다 — 여기서 할 일은 하나뿐이다.
 *
 * ⚠️ 로그인 벽이 아니다. 이 화면은 사용자가 '저장'이나 '로그인'을 눌러야만 도달한다.
 * 플랜 생성·결과·대회 페이지는 전부 로그인 없이 열린다 (§9.2, §13).
 */
export const metadata: Metadata = {
  title: '로그인',
  // 검색 결과에 로그인 화면이 뜰 이유가 없다
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ callbackUrl?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { callbackUrl } = await searchParams;
  const next = safeCallbackUrl(callbackUrl);

  // 이미 로그인했으면 여기 머물 이유가 없다
  if (await currentUserId()) redirect(next);

  /*
   * §15 login_prompted — **저장 게이트가 어디서 걸리는지** 보려는 이벤트다.
   * callbackUrl 이 곧 트리거다. 경로 원본을 그대로 보내면 플랜 입력이 인코딩된 채
   * 구글로 넘어가므로(§9.4) 어느 화면에서 왔는지만 남긴다.
   */
  const trigger = next.startsWith('/plan/save') ? 'save' : next.startsWith('/me') ? 'settings' : 'other';

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-8 pt-10 pb-4">
      <TrackEvent name={EVENTS.loginPrompted} dedupeKey={trigger} params={{ trigger }} />
      <section className="text-center">
        {/*
          워드마크가 아니라 **심벌**을 쓴다. 이유 둘 —
          상단 헤더가 이미 RUNBACK 워드마크를 들고 있어 두 번 나오고,
          public/brand/logos/*.png 는 디자인 보드에서 잘라낸 파일이라
          '로고 조합 (세로형)' 캡션과 잘린 태그라인이 그림 안에 박혀 있다.
          깨끗한 로고 락업이 납품되면 여기를 그걸로 바꾼다.
        */}
        <Image
          src="/brand/icons/RUNBACK_symbol_color.png"
          alt=""
          width={260}
          height={230}
          priority
          className="mx-auto h-16 w-auto"
        />
        <p className="mt-4 text-body-lg text-ink-muted">
          플랜을 저장하고 기기 간에 이어 보세요.
        </p>
      </section>

      <section>
        <KakaoSignInButton redirectTo={next} />
        <p className="mt-3 text-center text-label text-ink-muted">
          로그인하지 않아도 링크를 복사해 플랜을 보관할 수 있습니다
        </p>
      </section>

      {/*
        이메일 로그인은 보조 수단이다 (AUTH_PASSWORD_LOGIN opt-in, PRD §9.3).
        접어 두면 카카오가 유일한 주 경로로 읽힌다 — 플래그가 꺼져 있으면 통째로 사라진다.
      */}
      <PasswordLoginSection redirectTo={next} />

      <p className="text-center text-micro leading-relaxed text-ink-muted">
        로그인하면 <a className="underline" href="/terms">이용약관</a>과{' '}
        <a className="underline" href="/privacy">개인정보처리방침</a>에 동의하는 것으로 봅니다.
      </p>
    </div>
  );
}
