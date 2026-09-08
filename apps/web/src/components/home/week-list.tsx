import { SessionRow, type RowStatus } from '@/components/ui/list-row';

export type WeekItem = {
  day: string;
  status: RowStatus;
  title: string;
};

/** 이번 주 세션 목록. 완료 체크는 F-12 로 붙는다 */
export function WeekList({ items, title = '이번 주' }: { items: WeekItem[]; title?: string }) {
  return (
    <section>
      <h3 className="text-[18px] font-bold text-ink">{title}</h3>
      <div className="mt-2">
        {items.map((item, i) => (
          <SessionRow key={`${item.day}-${i}`} day={item.day} status={item.status} title={item.title} />
        ))}
      </div>
    </section>
  );
}
