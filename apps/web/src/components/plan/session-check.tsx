import { Button } from '@/components/ui/button';
import { setSessionStatus, toggleSessionDone } from '@/lib/log-actions';
import { TrackOnClick } from '@/components/analytics/track-on-click';
import { EVENTS } from '@/lib/analytics-events';

/**
 * 오늘 훈련 체크 (F-12). 목업의 '훈련 기록하기' 자리다.
 *
 * 거리·시간·기분을 받는 상세 입력은 만들지 않았다 — PRD 는 그걸 2차(§6 P2 수행 로그 입력)로
 * 두고 있고, F-12 가 요구하는 건 **완료 체크**다. 스키마에는 `actualDistanceKm` 등이
 * 이미 있으니 상세 입력이 필요해지면 여기만 늘리면 된다.
 *
 * '건너뜀'을 따로 둔 이유: 안 뛴 날을 그냥 비워 두면 우리는 그게 '안 뛴 것'인지
 * '안 적은 것'인지 알 수 없다. 사용자가 직접 말해 준 것과 우리가 추측한 것은 다르다.
 */
export function SessionCheck({
  planId,
  date,
  status,
}: {
  planId: string;
  date: string;
  /** 지금 남아 있는 기록. 없으면 undefined */
  status: 'done' | 'skipped' | 'modified' | undefined;
}) {
  const done = status !== undefined && status !== 'skipped';
  const skipped = status === 'skipped';

  return (
    <div className="space-y-2">
      <form
        action={async () => {
          'use server';
          await toggleSessionDone(planId, date);
        }}
      >
        {/* §15 week_checked — 저장 플랜당 체크 발생률(목표 30%)의 분자다 */}
        <TrackOnClick
          name={EVENTS.weekChecked}
          params={{ status: done ? 'undone' : 'done', source: 'session_card' }}
        >
          <Button type="submit" size="md" variant={done ? 'soft' : 'outline'}>
            {done ? '✓ 완료함 — 취소하기' : '훈련 완료로 기록하기'}
          </Button>
        </TrackOnClick>
      </form>

      {/* 완료한 날에는 '건너뜀'을 보여 주지 않는다. 서로 배타적인 상태다 */}
      {done ? null : (
        <form
          action={async () => {
            'use server';
            await setSessionStatus(planId, date, 'skipped');
          }}
        >
          <TrackOnClick
            name={EVENTS.weekChecked}
            params={{ status: skipped ? 'unskipped' : 'skipped', source: 'session_card' }}
          >
            <Button type="submit" size="sm" variant="ghost">
              {skipped ? '건너뜀 취소' : '오늘은 건너뜁니다'}
            </Button>
          </TrackOnClick>
        </form>
      )}
    </div>
  );
}
