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
    // 16 을 함께 주는 이유: 브라우저가 32 를 줄이면 얇은 획이 뭉갠다.
    // 납품 세트에 16 전용 렌더가 있으므로 그걸 쓴다 (의뢰서 §5)
    icon: [
      { url: '/brand/pwa/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/brand/pwa/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/pwa/favicon-48.png', sizes: '48x48', type: 'image/png' },
    ],
    // 투명 배경 불가 — 크림이 깔린 파일이다 (의뢰서 §6)
    apple: '/brand/pwa/apple-touch-icon.png',
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
