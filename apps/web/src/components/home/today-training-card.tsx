import { SectionLabel } from '@/components/ui/card';
import { BigStat } from '@/components/ui/stat';
import { Illustration } from '@/components/ui/illustration';

/** 오늘 할 세션 하나. 러너가 이 화면에서 얻어 갈 정보는 결국 이것뿐이다 */
export function TodayTrainingCard({
  typeLabel,
  distanceKm,
  paceRange,
  note,
}: {
  /** EASY RUN, TEMPO … */
  typeLabel: string;
  distanceKm: number;
  /** '6:40 ~ 7:10' */
  paceRange: string;
  note?: string;
}) {
  return (
    <section className="relative flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <SectionLabel>Today&apos;s training</SectionLabel>
        <h3 className="mt-1 text-[22px] font-extrabold tracking-tight text-ink uppercase">{typeLabel}</h3>
        <div className="mt-1">
          <BigStat value={distanceKm.toFixed(1)} unit="KM" size="lg" />
        </div>
        <p className="mt-3 flex items-center gap-2 text-[17px] font-semibold text-ink">
          <svg
            viewBox="0 0 24 24"
            className="size-5 shrink-0 text-accent"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="tabular">{paceRange}</span>
          <span className="text-ink-muted">/km</span>
        </p>
        {note ? <p className="mt-2 text-[14px] leading-snug text-ink-muted">{note}</p> : null}
      </div>

      <Illustration name="runner" width={160} className="-mt-4 shrink-0" />
    </section>
  );
}
