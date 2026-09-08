import type { Metadata } from 'next';
import Link from 'next/link';
import { upcomingRaces } from '@raceback/races';
import { distanceLabel, formatDday, formatRaceDate, todayKst } from '@/lib/format';
import { daysBetween } from '@/lib/plan-view';

export const metadata: Metadata = { title: '대회' };
export const revalidate = 3600;

export default function RacesPage() {
  const today = todayKst();
  const races = upcomingRaces(today);

  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-[28px] font-extrabold tracking-tight text-ink">대회</h1>
      <p className="text-[15px] text-ink-muted">
        예정된 {races.length}개 대회. 날짜를 고르면 그날까지 역산한 플랜을 만들어 드립니다.
      </p>

      <ul className="divide-y divide-line">
        {races.map((race) => (
          <li key={race.slug}>
            <Link href={`/race/${race.slug}`} className="flex items-center gap-3 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-bold text-ink">{race.nameKo}</p>
                <p className="mt-0.5 text-[13px] text-ink-muted">
                  {formatRaceDate(race.date)} · {race.region}
                </p>
                <p className="mt-1 text-[13px] text-ink-faint">
                  {race.distances.map(distanceLabel).join(' · ')}
                </p>
              </div>
              <span className="tabular shrink-0 text-[15px] font-bold text-brand">
                {formatDday(daysBetween(today, race.date))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
