import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: '나' };

/** 계정 화면 (PRD §10.8). 인증은 W6 */
const MENU = [
  { href: '/me', label: '내 보관함' },
  { href: '/me', label: '데이터 내보내기' },
  { href: '/privacy', label: '개인정보처리방침' },
  { href: '/terms', label: '이용약관' },
] as const;

export default function MePage() {
  return (
    <div className="space-y-6 pt-2">
      <h1 className="text-[28px] font-extrabold tracking-tight text-ink">나</h1>

      <div className="rounded-card border border-line bg-surface px-5 py-6 text-center">
        <p className="text-[16px] font-bold text-ink">플랜을 저장하고 어느 기기에서든 이어보려면</p>
        <p className="mt-1 text-[15px] text-ink-muted">로그인해 주세요</p>
        {/* §9.2 저장 게이트 — 로그인은 생성이 아니라 저장 시점에만 요구한다 */}
        <p className="mt-4 text-[13px] text-ink-faint">로그인 없이 링크 복사로도 플랜을 보관할 수 있습니다</p>
      </div>

      <ul className="divide-y divide-line">
        {MENU.map((item) => (
          <li key={item.label}>
            <Link href={item.href} className="flex items-center justify-between py-4 text-[16px] text-ink">
              {item.label}
              <svg viewBox="0 0 20 20" className="size-4 text-ink-faint" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M7 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
