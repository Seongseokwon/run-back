import type { MetadataRoute } from 'next';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/config';

/**
 * PWA 매니페스트 — 홈 화면에 추가했을 때의 동작.
 *
 * `start_url` 이 `/` 가 아니라 `/today` 인 것이 핵심이다. 루트는 검색 유입의 착지점이라
 * 히어로·대회 목록·목표 클러스터를 보여 줘야 하는데(§13), 이미 설치한 사람에게는
 * 그게 광고지처럼 읽힌다. 설치한 사람은 앱 셸로 바로 들어간다.
 *
 * 스플래시는 우리가 그리는 게 아니라 **OS 가 아이콘 + background_color 로 만들어 준다.**
 * 그래서 background_color 를 앱 캔버스와 같은 크림으로 맞춘다 — 다르면 앱이 열리는 순간
 * 배경색이 한 번 바뀌어 깜빡임으로 보인다.
 *
 * 아이콘은 납품된 정식 자산이다 (public/brand/pwa/). 원본 보드와 로고 변형은
 * public/brand/ 아래 icons/ · logos/ 에 함께 있다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description: '대회 날짜에서 역산해 주차별 러닝 훈련 플랜을 만들어 드립니다.',
    start_url: '/today',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'ko',
    // globals.css 의 --color-canvas 와 같은 값. 다르면 실행 순간 배경이 한 번 튄다
    background_color: '#fbf7f0',
    theme_color: '#fbf7f0',
    categories: ['health', 'fitness', 'sports'],
    icons: [
      { src: '/brand/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // 안드로이드가 바깥 10% 를 잘라내므로 안전 영역을 반영한 별도 파일이다
      { src: '/brand/pwa/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
