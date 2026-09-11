import { CardSkeleton, ListSkeleton, Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-8 pt-2" aria-busy aria-label="불러오는 중">
      <div>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="mt-2 h-8 w-1/2" />
        <Skeleton className="mt-4 h-4 w-full" />
      </div>
      <CardSkeleton />
      <ListSkeleton />
    </div>
  );
}
