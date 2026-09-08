import type { Metadata } from 'next';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: '목표 판정' };

/**
 * 판정 화면 — PRD §10.4. 이 제품의 핵심 차별 기능이 사용자에게 드러나는 유일한 화면이다.
 *
 * 엔진의 `assessFeasibility()` 는 이미 완성돼 있고, 판정·대안 기록 2개·완주 전환까지
 * 전부 반환한다. 여기서는 그걸 배치하기만 하면 된다.
 *
 * 문구 원칙 (§7.3): 겁주지 말고 대안을 즉시 제시할 것.
 */
const VERDICTS = [
  { key: 'safe', badge: '🟢', label: '안정권', desc: '여유가 있습니다. 목표를 높여도 됩니다', color: 'text-verdict-safe' },
  { key: 'challenging', badge: '🟡', label: '도전적', desc: '빠듯합니다. 주 N회를 지키는 게 관건입니다', color: 'text-verdict-challenging' },
  { key: 'unrealistic', badge: '🔴', label: '비현실적', desc: '달성 가능한 대안 기록 2개와 완주 목표 전환을 함께 제시합니다', color: 'text-verdict-unrealistic' },
] as const;

export default function VerdictPage() {
  return (
    <div className="space-y-6 pt-2">
      <h1 className="text-[28px] font-extrabold tracking-tight text-ink">목표 판정</h1>
      <p className="text-[15px] leading-relaxed text-ink-muted">
        남은 기간과 지금 실력으로 목표가 가능한지 먼저 말씀드립니다. 불가능한 목표를 그대로 플랜으로
        만들어 드리지 않습니다.
      </p>

      <div className="space-y-3">
        {VERDICTS.map((v) => (
          <Card key={v.key} className="px-5 py-4">
            <p className={`text-[17px] font-bold ${v.color}`}>
              {v.badge} {v.label}
            </p>
            <p className="mt-1 text-[14px] text-ink-muted">{v.desc}</p>
          </Card>
        ))}
      </div>

      <p className="rounded-lg border border-dashed border-line-strong px-4 py-3 text-[12px] leading-relaxed text-ink-faint">
        TODO · 엔진의 assessFeasibility() 결과를 배선한다. 판정 배지 + 한 문장 근거,
        🔴일 때 대안 기록 2개와 &ldquo;완주 목표로&rdquo; 버튼, 🟢일 때 상향 목표 제안 1개.
      </p>
    </div>
  );
}
