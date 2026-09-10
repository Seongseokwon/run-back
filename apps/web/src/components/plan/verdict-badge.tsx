import type { Verdict } from '@runback/engine';

const STYLE: Record<Verdict, { emoji: string; label: string; className: string }> = {
  safe: { emoji: '🟢', label: '안정권', className: 'text-verdict-safe' },
  challenging: { emoji: '🟡', label: '도전적', className: 'text-verdict-challenging' },
  unrealistic: { emoji: '🔴', label: '비현실적', className: 'text-verdict-unrealistic' },
};

export function VerdictBadge({ verdict, size = 'lg' }: { verdict: Verdict; size?: 'sm' | 'lg' }) {
  const s = STYLE[verdict];
  return (
    <p className={`font-extrabold ${s.className} ${size === 'lg' ? 'text-title' : 'text-body'}`}>
      {s.emoji} {s.label}
    </p>
  );
}

export function verdictLabel(verdict: Verdict): string {
  return STYLE[verdict].label;
}
