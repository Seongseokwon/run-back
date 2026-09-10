import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { GoogleAnalytics } from '@/components/analytics/google-analytics';
import { RedirectMarkers } from '@/components/analytics/redirect-markers';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/config';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: { siteName: SITE_NAME, locale: 'ko_KR', type: 'website' },
  manifest: '/manifest.webmanifest',
  icons: {
    /*
     * 16 을 따로 주는 이유: 브라우저가 32 를 줄이면 얇은 획이 뭉갠다.
     *
     * **테마별로 파일이 다르다.** 브랜드 보라는 어두워서 크롬 다크 탭에서 1.7:1 밖에
     * 안 나온다 (WCAG 비텍스트 기준 3:1). 라이트 탭에서는 7:1 로 멀쩡하다.
     * 하나로 맞추려 색을 바꾸면 한쪽이 나빠지므로 `media` 로 갈랐다.
     *
     * ⚠️ 다크 항목이 **먼저** 와야 한다. 조건 없는 항목이 앞에 오면 일부 브라우저가
     * 그걸 먼저 채택하고 media 항목을 무시한다.
     */
    icon: [
      { url: '/brand/favicon-16-dark.png', sizes: '16x16', type: 'image/png', media: '(prefers-color-scheme: dark)' },
      { url: '/brand/favicon-32-dark.png', sizes: '32x32', type: 'image/png', media: '(prefers-color-scheme: dark)' },
      { url: '/brand/favicon-48-dark.png', sizes: '48x48', type: 'image/png', media: '(prefers-color-scheme: dark)' },
      { url: '/brand/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/favicon-48.png', sizes: '48x48', type: 'image/png' },
    ],
    // 투명 배경 불가 — 크림이 깔린 파일이다 (의뢰서 §6)
    apple: '/brand/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#fbf7f0',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      {/* 모바일 우선. 데스크톱에서도 모바일 폭을 유지하고 가운데 정렬한다 (PRD §10 기준 375px) */}
      <body className="mx-auto min-h-dvh max-w-md">
        {children}
        {/* 측정 ID 가 없으면 아무것도 렌더하지 않는다 (§15, PRD v1.4) */}
        <GoogleAnalytics />
        {/* useSearchParams 를 쓰므로 Suspense 가 필요하다 — 정적 페이지를 동적으로 만들지 않는다 */}
        <Suspense fallback={null}>
          <RedirectMarkers />
        </Suspense>
      </body>
    </html>
  );
}
