import type { Metadata } from 'next';
import { LegalDocument } from '@/components/legal-document';
import { LEGAL } from '@/lib/legal';
import { TERMS_SECTIONS } from '@/lib/legal-content';
import { SITE_NAME } from '@/lib/config';

export const metadata: Metadata = {
  title: '이용약관',
  description: `${SITE_NAME} 서비스 이용 조건과 안전에 관한 고지입니다.`,
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return <LegalDocument title="이용약관" updatedAt={LEGAL.effectiveDate} sections={TERMS_SECTIONS} />;
}
