import { visibleZones, type ZoneKey, type ZonePace } from '@raceback/engine';
import { Card, SectionLabel } from '@/components/ui/card';

/**
 * 페이스표 — PRD §7.8.
 * 입문자에게는 E·M 두 개만 노출한다. 5개 존은 인지 부하가 크다.
 * 값은 항상 범위로 보여준다 — 근거 없는 정밀도는 신뢰를 깎는다 (§7.2).
 */
export function PaceTable({
  paces,
  level,
}: {
  paces: Record<ZoneKey, ZonePace>;
  level: 'novice' | 'full';
}) {
  const zones = visibleZones(level);
  const hidden = level === 'novice';

  return (
    <Card className="px-5 py-5">
      <SectionLabel>목표 페이스</SectionLabel>
      <table className="mt-3 w-full">
        <caption className="sr-only">훈련 존별 목표 페이스 (1km 당)</caption>
        <tbody>
          {zones.map((key) => {
            const zone = paces[key];
            return (
              <tr key={key} className="border-b border-line last:border-b-0">
                <th scope="row" className="py-3 text-left align-top">
                  <span className="text-body font-bold text-ink">
                    {key} · {zone.nameKo}
                  </span>
                  <span className="mt-0.5 block max-w-[11rem] text-micro leading-snug font-normal text-ink-muted">
                    {zone.purposeKo}
                  </span>
                </th>
                <td className="tabular py-3 text-right align-top text-body-lg font-bold whitespace-nowrap text-ink">
                  {zone.display}
                  <span className="ml-1 text-label font-medium text-ink-muted">/km</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {hidden ? (
        <p className="mt-3 text-label leading-relaxed text-ink-muted">
          지금은 이지와 마라톤 페이스 두 개만 챙기면 됩니다. 나머지 존은 훈련이 쌓인 뒤에 씁니다.
        </p>
      ) : null}
    </Card>
  );
}
