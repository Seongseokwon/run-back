import Link from 'next/link';
import { Illustration } from '@/components/ui/illustration';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <Illustration name="emptyPlan" width={180} />
      <div>
        <h1 className="text-[22px] font-extrabold text-ink">찾을 수 없는 페이지입니다</h1>
        <p className="mt-1 text-[15px] text-ink-muted">주소가 바뀌었거나 지난 대회일 수 있습니다.</p>
      </div>
      <Link href="/" className="text-[16px] font-bold text-brand-ink">
        홈으로
      </Link>
    </main>
  );
}
