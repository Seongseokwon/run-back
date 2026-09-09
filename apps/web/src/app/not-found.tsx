import Link from 'next/link';
import { SceneBand } from '@/components/ui/scene';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <SceneBand name="emptyPlan" aspect={2.4} className="w-full max-w-xs" />
      <div>
        <h1 className="text-card font-extrabold text-ink">찾을 수 없는 페이지입니다</h1>
        <p className="mt-1 text-body text-ink-muted">주소가 바뀌었거나 지난 대회일 수 있습니다.</p>
      </div>
      <Link href="/" className="text-body font-bold text-brand-ink">
        홈으로
      </Link>
    </main>
  );
}
