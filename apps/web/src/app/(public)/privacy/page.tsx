import type { Metadata } from 'next';
import { LegalDocument } from '@/components/legal-document';
import { LEGAL, hasUnresolvedLegalInfo } from '@/lib/legal';
import { PRIVACY_SECTIONS } from '@/lib/legal-content';
import { SITE_NAME } from '@/lib/config';

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description: `${SITE_NAME}이 처리하는 개인정보 항목과 이용자의 권리를 안내합니다.`,
  alternates: { canonical: '/privacy' },
};

/**
 * F-20. 카카오 비즈앱 심사 제출물이기도 하다 (PRD §16 W5).
 * 이 페이지가 없으면 심사를 접수할 수 없고, 심사가 밀리면 전체 일정이 밀린다.
 */
export default function PrivacyPage() {
  return (
    <LegalDocument
      title="개인정보처리방침"
      updatedAt={LEGAL.effectiveDate}
      sections={PRIVACY_SECTIONS}
    >
      <dl className="mt-3 space-y-1.5 rounded-control bg-surface-sunken px-4 py-3.5">
        <div className="flex gap-3 text-[15px]">
          <dt className="w-24 shrink-0 font-semibold text-ink">보호책임자</dt>
          <dd className="text-ink-muted">{LEGAL.privacyOfficerName}</dd>
        </div>
        <div className="flex gap-3 text-[15px]">
          <dt className="w-24 shrink-0 font-semibold text-ink">연락처</dt>
          <dd className="break-all text-ink-muted">{LEGAL.privacyOfficerContact}</dd>
        </div>
        {LEGAL.businessNumber ? (
          <div className="flex gap-3 text-[15px]">
            <dt className="w-24 shrink-0 font-semibold text-ink">사업자번호</dt>
            <dd className="text-ink-muted">{LEGAL.businessNumber}</dd>
          </div>
        ) : null}
      </dl>

      {/* 개발 중에만 뜬다. 플레이스홀더인 채로 배포하면 심사에서 반려된다 */}
      {process.env.NODE_ENV !== 'production' && hasUnresolvedLegalInfo() ? (
        <p className="mt-3 rounded-control border border-dashed border-line-strong px-4 py-3 text-[13px] leading-relaxed text-ink-faint">
          ⚠️ 신원 정보가 아직 플레이스홀더입니다. PRD O8·O9 결정 후 `src/lib/legal.ts` 를 채우세요.
          이 상태로는 카카오 비즈앱 심사에 제출할 수 없습니다.
        </p>
      ) : null}
    </LegalDocument>
  );
}
