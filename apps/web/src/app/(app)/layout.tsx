import { AppHeader } from '@/components/layout/app-header';
import { TabBar } from '@/components/layout/tab-bar';

/** 앱 셸 — 로그인 사용자가 반복해서 오는 화면. 하단 탭이 붙는다 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <main className="px-5 pb-[calc(var(--spacing-tabbar)+24px)]">{children}</main>
      <TabBar />
    </>
  );
}
