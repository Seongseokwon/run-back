import type { ReactNode } from 'react';

/**
 * 앱 셸 안의 한 화면.
 *
 * 헤더를 레이아웃이 아니라 화면이 고르게 한 이유: 탭 최상단은 로고 헤더(AppHeader),
 * 한 단계 들어간 화면은 뒤로가기 헤더(SubHeader)를 써야 하는데,
 * 레이아웃에 헤더를 박아 두면 그 분기를 만들 자리가 없다.
 */
export function AppScreen({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <>
      {header}
      <main className="px-5">{children}</main>
    </>
  );
}
