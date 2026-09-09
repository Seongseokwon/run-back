import type { MetadataRoute } from 'next';
import { seoReadyRaces } from '@raceback/races';
import { GOALS } from '@/lib/goals';
import { SITE_URL } from '@/lib/config';
import { todayKst } from '@/lib/format';

/**
 * PRD §13.2 규칙 5 — **실제 가치 있는 페이지만 등록한다.**
 *
 * 대회 페이지는 고유 콘텐츠가 있는 것만(`seoReadyRaces`) 넣는다. 색인 대상을 늘리려고
 * 빈 페이지까지 등록하면 저품질 대량생성으로 판정될 수 있고, 그러면 사이트 전체가 죽는다.
 * 플랜 결과 페이지는 개인 데이터라 아예 넣지 않는다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const today = todayKst();

  return [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    // 대회 목록 허브. 고유 콘텐츠가 있는 대회만 링크하므로 색인해도 안전하다
    { url: `${SITE_URL}/race`, changeFrequency: 'daily', priority: 0.8 },
    ...seoReadyRaces(today).map((race) => ({
      url: `${SITE_URL}/race/${race.slug}`,
      lastModified: new Date(race.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
    ...GOALS.map((goal) => ({
      url: `${SITE_URL}/goal/${goal.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
