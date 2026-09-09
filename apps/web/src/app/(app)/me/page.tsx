import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { AppScreen } from '@/components/layout/app-screen';
import { ButtonLink } from '@/components/ui/button';
import { myRaces } from '@/lib/demo-plan';
import { todayKst } from '@/lib/format';
import { sessionProgress } from '@/lib/plan-view';

export const metadata: Metadata = { title: '나' };
export const dynamic = 'force-dynamic';

/**
 * 나 탭 — 프로필과 설정 (PRD §10.8).
 *
 * 인증은 W6 이라 지금 닉네임 자리는 '게스트'다. 로그인한 척하는 가짜 프로필을 넣지 않는다.
 * 대신 숫자 세 칸은 진짜다 — 등록한 대회와 세션 수는 엔진이 낸 플랜에서 그대로 온다.
 *
 * 목업에 있던 '성별'은 넣지 않았다. PRD §9.4 가 성별 미수집을 명시하고 있어서,
 * 수집하지 않겠다고 써 둔 항목의 입력란을 화면에 두면 방침과 화면이 어긋난다 (O13 미결).
 * '디바이스 연동'도 뺐다 — 웹에서 워치·앱 실시간 연동은 불가하다 (§3.3 Non-goal, O14).
 */
export default function MePage() {
  const today = todayKst();
  const races = myRaces(today);
  const totals = races.reduce(
    (acc, item) => {
      const p = sessionProgress(item.plan, today);
      return { done: acc.done + p.done, total: acc.total + p.total };
    },
    { done: 0, total: 0 },
  );

  return (
    <AppScreen header={<AppHeader />}>
      <div className="space-y-7 pt-2">
        <h1 className="text-[28px] font-extrabold tracking-tight text-ink">나</h1>

        {/* 프로필 — 닉네임과 한 줄 상태 */}
        <section className="rounded-card border border-line bg-surface px-5 py-5">
          <div className="flex items-center gap-4">
            <span
              aria-hidden
              className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[22px] font-extrabold text-brand-ink"
            >
              G
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[20px] font-extrabold tracking-tight text-ink">게스트</p>
              <p className="mt-0.5 text-[14px] text-ink-muted">
                {races.length > 0 ? `${races[0]!.race.nameKo} 준비 중` : '아직 목표 대회가 없습니다'}
              </p>
            </div>
          </div>

          {/* §9.2 저장 게이트 — 로그인은 플랜 '생성'이 아니라 '저장' 시점에만 요구한다 */}
          <div className="mt-5">
            <ButtonLink href="/plan/new" size="md" variant="soft">
              로그인하고 플랜 저장하기
            </ButtonLink>
          </div>
          <p className="mt-2 text-center text-[13px] text-ink-muted">
            로그인 없이도 링크를 복사해 플랜을 보관할 수 있습니다
          </p>
        </section>

        <section className="grid grid-cols-3 divide-x divide-line rounded-card border border-line bg-surface py-4">
          <MiniStat value={races.length} label="등록한 대회" />
          <MiniStat value={totals.done} label="지난 세션" />
          <MiniStat value={totals.total} label="전체 세션" />
        </section>

        <section>
          <h2 className="text-[15px] font-bold text-ink-muted">훈련</h2>
          <ul className="mt-1">
            <SettingRow href="/races" label="내 대회와 목표" />
            <SettingRow href="/plan/new" label="새 플랜 만들기" />
            <SettingRow label="알림 설정" pending />
          </ul>
        </section>

        <section>
          <h2 className="text-[15px] font-bold text-ink-muted">계정과 데이터</h2>
          <ul className="mt-1">
            <SettingRow label="내 보관함" pending />
            <SettingRow label="데이터 내보내기" pending />
            <SettingRow href="/privacy" label="개인정보처리방침" />
            <SettingRow href="/terms" label="이용약관" />
          </ul>
        </section>
      </div>
    </AppScreen>
  );
}

function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="px-2 text-center">
      <p className="tabular text-[26px] leading-none font-extrabold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-[12px] font-medium text-ink-muted">{label}</p>
    </div>
  );
}

/**
 * 설정 한 줄.
 *
 * 아직 없는 기능은 링크로 두지 않는다. 눌러서 아무 데도 안 가면 고장으로 읽힌다 —
 * '준비 중' 이라고 적고 누를 수 없게 두는 편이 정확하다.
 */
function SettingRow({ href, label, pending }: { href?: string; label: string; pending?: boolean }) {
  const content: ReactNode = (
    <>
      <span className="flex-1 text-[16px]">{label}</span>
      {pending ? (
        <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[12px] font-semibold text-ink-muted">
          준비 중
        </span>
      ) : (
        <svg viewBox="0 0 20 20" className="size-4 text-ink-muted" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M7 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </>
  );

  const cls = 'flex min-h-touch items-center gap-3 border-b border-line py-3.5 last:border-b-0';

  return (
    <li>
      {href && !pending ? (
        <Link href={href} className={`${cls} pressable -mx-2 rounded-lg px-2 text-ink hover:bg-surface-sunken/50`}>
          {content}
        </Link>
      ) : (
        <div className={`${cls} text-ink-muted`} aria-disabled>
          {content}
        </div>
      )}
    </li>
  );
}
