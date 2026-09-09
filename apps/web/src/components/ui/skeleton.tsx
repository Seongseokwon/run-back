/** 로딩 자리표시. 실제 콘텐츠와 같은 높이를 잡아 화면이 밀리지 않게 한다 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-surface-sunken ${className}`} />;
}

/** 카드 하나. 홈의 NEXT RACE 카드와 같은 높이를 잡는다 */
export function CardSkeleton() {
  return (
    <div className="rounded-card border border-line bg-surface px-5 py-5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-6 w-2/3" />
      <Skeleton className="mt-4 h-16 w-40" />
      <Skeleton className="mt-5 h-12 w-full" />
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <div className="flex-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-2 h-3 w-1/3" />
          </div>
          <Skeleton className="h-4 w-10" />
        </div>
      ))}
    </div>
  );
}
