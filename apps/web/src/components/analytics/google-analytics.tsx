import Script from 'next/script';
import { GA_MEASUREMENT_ID, isAnalyticsEnabled } from '@/lib/analytics';

/**
 * GA4 로더.
 *
 * **왜 `@next/third-parties` 의 `GoogleAnalytics` 를 쓰지 않았나.**
 * 그 컴포넌트는 `gtag('config', id)` 를 파라미터 없이 부른다. 아래 세 가지를 끄려면
 * config 에 값을 넘겨야 하는데 그 자리가 없다. 의존성 하나를 아끼는 것보다
 * **무엇을 수집하지 않는지 코드에 적어 두는 쪽**이 이 프로젝트에 맞는다 (§9.4).
 *
 * ## 끈 것들
 *
 * - `allow_google_signals: false` — 구글 계정에 로그인한 사용자의 인구통계·관심사
 *   수집을 끈다. 켜 두면 우리가 수집하지 않기로 한 **성별·연령대**가 구글 쪽에 쌓인다 (§9.4)
 * - `allow_ad_personalization_signals: false` — 맞춤형 광고용 신호를 보내지 않는다.
 *   광고 목적 수집은 별도 동의가 필요한 영역이라 아예 들어가지 않는다
 * - `ads_data_redaction: true` — 광고 관련 식별자를 빼고 보낸다
 *
 * 측정 ID 가 없으면 스크립트를 아예 넣지 않는다 — 로컬·프리뷰가 깨끗하게 유지된다.
 *
 * ⚠️ 이걸 켜면 Google LLC 가 수탁자로 추가된다. 방침 제6항(위탁)·제7항(국외 이전)·
 * 제10항(쿠키)에 반영돼 있어야 하고, `npm run legal` 이 그 일치를 검사한다.
 */
export function GoogleAnalytics() {
  if (!isAnalyticsEnabled()) return null;

  return (
    <>
      {/*
        ⚠️ shim 은 **beforeInteractive** 여야 한다.
        React 이펙트는 하이드레이션 직후에 도는데 `afterInteractive` 로 두면 그때 아직
        `window.gtag` 가 없다. 그러면 첫 화면 이벤트(plan_start·verdict_shown·
        plan_generated)가 통째로 유실된다 — 실제로 그렇게 짰다가 하나도 안 나갔다.

        그리고 `dataLayer.push` 에는 **`arguments` 객체**를 넣어야 한다. 배열을 넣으면
        GA 가 이벤트로 처리하지 않고 조용히 버린다. gtag 원본 스니펫 그대로 둔 이유다.
      */}
      <Script id="ga-init" strategy="beforeInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}', {
  allow_google_signals: false,
  allow_ad_personalization_signals: false,
  ads_data_redaction: true
});
        `}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
    </>
  );
}
