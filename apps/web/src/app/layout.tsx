import type { Metadata, Viewport } from 'next';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/config';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: { siteName: SITE_NAME, locale: 'ko_KR', type: 'website' },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/logo-mark.svg', type: 'image/svg+xml' },
    ],
    // 투명 배경 불가 — 크림을 깔아 둔 파일이다 (의뢰서 §6)
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
      <body className="mx-auto min-h-dvh max-w-md">{children}</body>
    </html>
  );
}
