import { CardSkeleton, ListSkeleton, Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-7 px-gutter pt-16" aria-busy aria-label="불러오는 중">
      <Skeleton className="h-9 w-2/3" />
      <CardSkeleton />
      <ListSkeleton rows={4} />
    </div>
  );
}
