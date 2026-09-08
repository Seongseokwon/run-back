import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // 플랜 결과는 개인 데이터이고 조합이 무한하다. 색인 대상이 아니다
      disallow: ['/plan/result', '/plan/verdict', '/today', '/log', '/me'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
