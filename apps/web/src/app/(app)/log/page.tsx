import type { Metadata } from 'next';

export const metadata: Metadata = { title: '기록' };

/** F-12 주차 완료 체크가 쌓이는 곳. 수행 로그 상세 입력은 2차 로드맵 */
export default function LogPage() {
  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-[28px] font-extrabold tracking-tight text-ink">기록</h1>
      <p className="text-[15px] text-ink-muted">완료한 세션이 여기 쌓입니다.</p>
      <div className="rounded-card border border-dashed border-line-strong px-5 py-10 text-center">
        <p className="text-[15px] text-ink-faint">아직 기록이 없습니다</p>
      </div>
    </div>
  );
}
