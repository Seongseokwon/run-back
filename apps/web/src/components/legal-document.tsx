import type { LegalSection } from '@/lib/legal-content';

/**
 * 법적 고지 문서 렌더러.
 * 본문 전체가 `**` 로 감싸인 문단은 강조한다 — 안전 고지처럼 놓치면 안 되는 문장용.
 */
export function LegalDocument({
  title,
  updatedAt,
  sections,
  children,
}: {
  title: string;
  updatedAt: string;
  sections: LegalSection[];
  /** 보호책임자처럼 상수에서 오는 블록을 특정 위치에 끼울 때 */
  children?: React.ReactNode;
}) {
  return (
    <article className="pt-2 pb-8">
      <h1 className="text-[26px] font-extrabold tracking-tight text-ink">{title}</h1>
      <p className="mt-1 text-[13px] text-ink-muted">시행일 {updatedAt}</p>

      <div className="mt-6 space-y-7">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-[17px] font-bold text-ink">{section.heading}</h2>
            {section.paragraphs.map((text) => {
              const strong = text.startsWith('**') && text.endsWith('**');
              return (
                <p
                  key={text}
                  className={`mt-2 text-[15px] leading-relaxed ${
                    strong ? 'font-bold text-ink' : 'text-ink-muted'
                  }`}
                >
                  {strong ? text.slice(2, -2) : text}
                </p>
              );
            })}
            {section.list ? (
              <ul className="mt-2 space-y-1.5">
                {section.list.map((item) => (
                  <li key={item} className="flex gap-2 text-[15px] leading-relaxed text-ink-muted">
                    <span aria-hidden className="text-ink-muted">
                      ·
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {section.heading.startsWith('10.') ? children : null}
          </section>
        ))}
      </div>
    </article>
  );
}
