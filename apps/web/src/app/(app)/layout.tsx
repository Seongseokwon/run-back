import { TabBar } from '@/components/layout/tab-bar';

/**
 * 앱 셸 — 로그인 사용자가 반복해서 오는 화면. 하단 탭이 붙는다.
 * 헤더는 화면마다 다르므로 여기서 그리지 않는다 (AppScreen 참고).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom)+24px)]">
      {children}
      <TabBar />
    </div>
  );
}
