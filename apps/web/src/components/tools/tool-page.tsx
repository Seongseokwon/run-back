import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { ButtonLink } from '@/components/ui/button';
import type { Tool } from '@/lib/tools';

/**
 * 계산기 페이지의 뼈대 — 질문형 H1 · 직답 · 계산기 · 본문 · FAQ · 다음 걸음.
 *
 * 두 도구가 같은 순서를 쓰는 이유는 템플릿이라서가 아니라 **읽는 순서가 같아서**다.
 * 검색으로 들어온 사람은 질문의 답을 먼저 확인하고, 그다음 자기 숫자를 넣어 본다.
 * §13.2 가 금지하는 것은 이 뼈대가 아니라 **내용이 같은 페이지**이고, 문장은
 * `lib/tools.ts` 에서 도구마다 따로 쓴다.
 */
export function ToolPage({ tool, children }: { tool: Tool; children: ReactNode }) {
  // AEO — 질문과 직답을 구조화 데이터로도 준다 (§13.3)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: tool.question,
        acceptedAnswer: { '@type': 'Answer', text: tool.lead },
      },
      ...tool.faq.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    ],
  };

  return (
    <div className="space-y-7 pt-2">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section>
        <h1 className="text-title leading-tight font-extrabold tracking-tight text-ink">
          {tool.question}
        </h1>
        <p className="mt-3 text-body leading-relaxed text-ink">{tool.lead}</p>
      </section>

      {children}

      <section className="space-y-3">
        {tool.body.map((paragraph) => (
          <p key={paragraph} className="text-body leading-relaxed text-ink">
            {paragraph}
          </p>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-section font-bold text-ink">자주 묻는 질문</h2>
        {tool.faq.map((item) => (
          <Card key={item.q} tone="sunken" className="px-5 py-4">
            <h3 className="text-body-lg font-bold text-ink">{item.q}</h3>
            <p className="mt-1.5 text-body leading-relaxed text-ink">{item.a}</p>
          </Card>
        ))}
      </section>

      {/* 계산기는 답을 주고 끝난다. 이 제품이 실제로 하는 일은 그다음이다 */}
      <section className="space-y-3">
        <h2 className="text-section font-bold text-ink">계산만으로는 부족합니다</h2>
        <p className="text-body leading-relaxed text-ink">
          페이스를 안다고 대회 당일에 그 페이스가 나오지는 않습니다. RUNBACK은 국내 대회
          날짜에서 역산해 남은 기간에 맞는 주차별 훈련 플랜을 만들고, 목표가 그 기간에
          현실적인지 먼저 알려 줍니다.
        </p>
        <ButtonLink href="/plan/new">내 대회로 플랜 만들기</ButtonLink>
        <Link
          href="/race"
          className="flex min-h-touch items-center justify-center text-body font-semibold text-brand-ink"
        >
          국내 대회 일정 보기
        </Link>
      </section>

      {/* 도구끼리 서로 잇는다. 페이지가 둘뿐이라 목록 허브를 따로 만들지 않았다 */}
      <ToolCrossLink current={tool.slug} />
    </div>
  );
}

function ToolCrossLink({ current }: { current: Tool['slug'] }) {
  const other =
    current === 'pace'
      ? { href: '/tools/vdot' as const, label: 'VDOT 계산기', hint: '기록 하나로 훈련 존 페이스까지' }
      : { href: '/tools/pace' as const, label: '페이스 계산기', hint: '목표 기록에서 구간 통과 시간까지' };

  return (
    <Link href={other.href} className="block">
      <Card className="flex items-center justify-between px-5 py-4">
        <span>
          <span className="block text-body font-bold text-ink">{other.label}</span>
          <span className="mt-0.5 block text-label text-ink-muted">{other.hint}</span>
        </span>
        <span aria-hidden className="text-body-lg font-bold text-ink-muted">
          →
        </span>
      </Card>
    </Link>
  );
}
