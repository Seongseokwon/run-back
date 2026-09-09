import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { TitleHeader } from '@/components/layout/app-header';
import { AppScreen } from '@/components/layout/app-screen';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SceneAvatar, SceneBand } from '@/components/ui/scene';
import { MenuRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/section';
import { myRaces } from '@/lib/demo-plan';
import { todayKst } from '@/lib/format';

export const metadata: Metadata = { title: '나' };
export const dynamic = 'force-dynamic';

/**
 * 나 탭 — 프로필과 설정 (PRD §10.8).
 *
 * 헤더가 로고가 아니라 제목이다 — 목업도 이 탭에서만 로고를 뺀다.
 * 화면이 짧아서 제목이 헤더와 본문에 두 번 나오면 같은 말이 두 번 나온다.
 *
 * 인증은 W6 이라 지금 닉네임 자리는 '게스트'다. 로그인한 척하는 가짜 프로필을 넣지 않는다.
 *
 * 목업의 메뉴 네 줄 중 둘을 뺐다.
 *  - **성별** — PRD §9.4 가 미수집으로 정해 뒀다. 수집하지 않겠다고 써 둔 항목의
 *    입력란을 화면에 두면 방침과 화면이 어긋난다 (O13 미결)
 *  - **디바이스 연동** — 웹에서 워치·헬스 앱 실시간 연동은 불가하다 (§3.3 Non-goal, O14)
 * 헤더의 톱니 아이콘도 뺐다 — 이 화면 자체가 설정이라 갈 곳이 없다.
 */
export default function MePage() {
  const today = todayKst();
  const races = myRaces(today);
  const goal = races[0];

  return (
    <AppScreen header={<TitleHeader title="나" />}>
      <Screen>
        <section className="flex items-center gap-4">
          <SceneAvatar name="profileAvatar" size={72} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2">
              <span className="truncate text-card font-extrabold tracking-tight text-ink">게스트</span>
              <Badge>로그인 전</Badge>
            </p>
            <p className="mt-1 truncate text-body text-ink-muted">
              {goal ? `${goal.race.nameKo}를 준비하고 있어요.` : '아직 목표 대회가 없습니다.'}
            </p>
          </div>
        </section>

        <Card>
          <ul>
            <MenuRow
              href="/races"
              icon={<Icon path="M12 3a9 9 0 100 18 9 9 0 000-18zm0 5a4 4 0 100 8 4 4 0 000-8z" />}
              label="러닝 목표"
              {...(goal ? { value: goal.race.nameKo } : {})}
            />
            <MenuRow
              href="/plan/new"
              icon={<Icon path="M12 5v14M5 12h14" />}
              label="새 플랜 만들기"
            />
            <MenuRow
              icon={<Icon path="M18 8a6 6 0 10-12 0c0 6-2 7-2 7h16s-2-1-2-7M13.7 20a2 2 0 01-3.4 0" />}
              label="알림 설정"
              disabled
              trailing={<Badge>준비 중</Badge>}
            />
          </ul>
        </Card>

        {/* §9.2 저장 게이트 — 로그인은 플랜 '생성'이 아니라 '저장' 시점에만 요구한다 */}
        <section>
          <ButtonLink href="/plan/new" size="md" variant="soft">
            로그인하고 플랜 저장하기
          </ButtonLink>
          <p className="mt-2 text-center text-label text-ink-muted">
            로그인 없이도 링크를 복사해 플랜을 보관할 수 있습니다
          </p>
        </section>

        <Card>
          <ul>
            <MenuRow
              icon={<Icon path="M4 7h16M4 12h16M4 17h10" />}
              label="내 보관함"
              disabled
              trailing={<Badge>준비 중</Badge>}
            />
            <MenuRow
              icon={<Icon path="M12 4v11M8 11l4 4 4-4M5 19h14" />}
              label="데이터 내보내기"
              disabled
              trailing={<Badge>준비 중</Badge>}
            />
            <MenuRow
              href="/privacy"
              icon={<Icon path="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" />}
              label="개인정보처리방침"
            />
            <MenuRow
              href="/terms"
              icon={<Icon path="M6 3h9l4 4v14H6zM14 3v5h5" />}
              label="이용약관"
            />
          </ul>
        </Card>

        {/* 화면 끝 배웅 그림. 목록이 끝났다는 걸 여백이 아니라 그림으로 알린다 */}
        <SceneBand name="profileScene" aspect={2.4} />
      </Screen>
    </AppScreen>
  );
}

/** 메뉴 왼쪽 아이콘. 선 굵기와 마감을 한 곳에서 맞춘다 */
function Icon({ path }: { path: string }): ReactNode {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[22px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}
