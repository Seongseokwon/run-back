import { SectionLabel } from '@/components/ui/card';
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
    <section className="relative flex items-start justify-between pt-1">
      <div className="relative z-1">
        <SectionLabel>Today&apos;s training</SectionLabel>
        <h3 className="mt-1 text-[22px] font-extrabold tracking-tight text-ink uppercase">{typeLabel}</h3>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="tabular text-[56px] leading-none font-extrabold tracking-tighter text-ink">
            {distanceKm.toFixed(1)}
          </span>
          <span className="text-[20px] font-bold text-ink-muted">KM</span>
        </p>
        <p className="mt-3 flex items-center gap-2 text-[17px] font-semibold text-ink">
          <svg viewBox="0 0 24 24" className="size-5 text-accent" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="tabular">{paceRange}</span>
          <span className="text-ink-muted">/km</span>
        </p>
        {note ? <p className="mt-2 max-w-[15rem] text-[14px] leading-snug text-ink-muted">{note}</p> : null}
      </div>

      <Illustration name="runner" width={175} className="-mt-6" />
    </section>
  );
}
