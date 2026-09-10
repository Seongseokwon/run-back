import { SessionRow, type RowStatus } from '@/components/ui/list-row';
import { Section } from '@/components/ui/section';

export type WeekItem = {
  /** ISO 날짜. 기록 토글이 이 값을 쓴다 (F-12) */
  date: string;
  day: string;
  status: RowStatus;
  /** 'Easy 5km' — 목업은 종류와 거리를 한 덩어리로 읽는다 */
  title: string;
};

/** 이번 주 세션 목록. 완료 체크는 F-12 로 붙는다 */
export function WeekList({ items, title = '이번 주' }: { items: WeekItem[]; title?: string }) {
  return (
    <Section title={title}>
      <div>
        {items.map((item, i) => (
          <SessionRow key={`${item.day}-${i}`} day={item.day} status={item.status} title={item.title} />
        ))}
      </div>
    </Section>
  );
}
