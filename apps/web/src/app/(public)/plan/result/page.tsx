import type { Metadata } from 'next';
import { Card } from '@/components/ui/card';
import { SAFETY_NOTICE } from '@/lib/config';

export const metadata: Metadata = { title: '내 훈련 플랜' };

/**
 * 플랜 결과 — PRD §10.5.
 *
 * 상태 저장(F-08): PlanInput 을 base64url 로 인코딩해 `?p=` 에 담는다.
 * 엔진이 결정론적이라 링크만 있으면 같은 플랜이 복원된다. 로그인 없이도 동작해야 한다.
 */
const SECTIONS = [
  { title: '상단 고정', todo: 'D-day · 목표 · 총 주차 · 예상 기록 범위' },
  { title: '페이스표', todo: 'E/M/T/I/R 5개 존. 입문자에게는 E·M 만 노출하고 나머지는 접는다 (§7.8)' },
  { title: '주차 리스트', todo: '아코디언. 현재 주차 자동 펼침 + 스크롤 앵커' },
  { title: '주차 카드', todo: '페이즈 뱃지 · 총 거리 · 일별 세션 7칸 · LLM 코멘트' },
  { title: 'ACWR 안내', todo: '클램프 발동 주차에 배지 (§7.10). 조용히 줄이지 않는다' },
  { title: '하단 고정 바', todo: '저장(링크 복사) · 캘린더 추가 · 공유' },
] as const;

export default function PlanResultPage() {
  return (
    <div className="space-y-6 pt-2">
      <h1 className="text-[28px] font-extrabold tracking-tight text-ink">내 훈련 플랜</h1>

      <div className="space-y-3">
        {SECTIONS.map((s) => (
          <Card key={s.title} className="px-5 py-4">
            <p className="text-[16px] font-bold text-ink">{s.title}</p>
            <p className="mt-1 text-[13px] text-ink-faint">TODO · {s.todo}</p>
          </Card>
        ))}
      </div>

      <p className="text-[12px] leading-relaxed text-ink-faint">{SAFETY_NOTICE}</p>
    </div>
  );
}
