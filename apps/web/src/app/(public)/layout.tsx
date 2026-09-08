import { PublicHeader } from '@/components/layout/app-header';

/**
 * 공개 레이아웃 — 검색 유입과 게스트 경로.
 * 하단 탭바가 없다. 크롤러와 첫 방문자에게는 누를 수 없는 탭이 소음이다.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicHeader />
      <main className="px-5 pb-16">{children}</main>
    </>
  );
}
