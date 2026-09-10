import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

/** 세션 완료 상태 — PRD F-12 주차 완료 체크 */
/**
 * 'missed' 와 'skipped' 는 다르다.
 *  - missed  : 날짜가 지났는데 아무 기록도 없다. **우리가 추측한 상태**
 *  - skipped : 사용자가 "건너뛰었다"고 직접 남긴 상태
 * 둘을 합치면 "안 뛴 것"과 "안 적은 것"을 구분할 수 없어진다.
 */
export type RowStatus = 'done' | 'todo' | 'rest' | 'missed' | 'skipped';

/**
 * 상태 표식은 **글자보다 작아야 한다** (18px, 옆 제목은 text-body-lg 17px).
 * 한때 24px 원에 2px 테두리였는데, 행에서 가장 정보가 적은 요소가 가장 무거워졌다 —
 * 특히 플랜 시작 전 '첫 주'는 전부 예정이라 굵은 빈 원만 일곱 개가 쌓인다.
 * 목업의 링도 얇다. 표식은 제목을 읽는 눈을 방해하지 않는 선까지만 있으면 된다.
 *
 * 뜻을 색으로만 전하지 않는다 (WCAG 1.4.1) — 다섯 상태가 전부 **형태로** 갈린다:
 * 하이픈(휴식) / 빈 링(예정) / 채운 체크(완료) / 점선 링(놓침) / 빗금 링(건너뜀)
 */
function StatusMark({ status }: { status: RowStatus }) {
  if (status === 'rest') {
    return <span aria-hidden className="block h-px w-3.5 rounded-full bg-ink-subtle" />;
  }
  if (status === 'done') {
    return (
      <span
        aria-hidden
        className="flex size-4.5 items-center justify-center rounded-full bg-brand text-on-brand"
      >
        <svg viewBox="0 0 20 20" className="size-2.5" fill="none" stroke="currentColor" strokeWidth={3}>
          <path d="M4 10.5l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (status === 'missed') {
    // 점선 — "비어 있다"는 인상. 우리가 추측한 상태라 단정적으로 그리지 않는다
    return (
      <span aria-hidden className="block size-4.5 rounded-full border border-dashed border-line-input" />
    );
  }
  if (status === 'skipped') {
    // 빗금 — 사용자가 직접 "건너뜀"이라고 남긴 것. 단정적인 표식이다
    return (
      <span
        aria-hidden
        className="flex size-4.5 items-center justify-center rounded-full border border-ink-subtle"
      >
        <svg viewBox="0 0 20 20" className="size-4.5 text-ink-subtle" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M6 14l8-8" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  return <span aria-hidden className="block size-4.5 rounded-full border border-line-input" />;
}

/**
 * 주간 목록의 한 줄 — 요일 / 상태 / 세션.
 *
 * 목업은 종류와 거리를 'Easy 5km' 한 덩어리로 읽는다. 거리를 따로 떼어
 * 우측 정렬하면 주간 볼륨이 눈에는 잘 들어오지만, 목업의 조용한 밀도가 깨진다.
 *
 * 화살표는 **갈 곳이 있을 때만** 그린다. 세션 상세 화면이 아직 없어서
 * 지금은 대부분 화살표 없이 나간다 — 눌러서 아무 일도 안 일어나면 고장으로 읽힌다.
 */
export function SessionRow({
  day,
  status,
  title,
  href,
}: {
  day: string;
  status: RowStatus;
  title: ReactNode;
  href?: ComponentProps<typeof Link>['href'];
}) {
  const rest = status === 'rest';
  const inner = (
    <>
      <span className={`w-5 shrink-0 text-body-lg font-bold ${rest ? 'text-ink-subtle' : 'text-ink'}`}>
        {day}
      </span>
      <span className="flex w-8 shrink-0 justify-center">
        <StatusMark status={status} />
      </span>
      <span className={`min-w-0 flex-1 truncate text-body-lg ${rest ? 'text-ink-muted' : 'text-ink'}`}>
        {title}
      </span>
      {href ? (
        <svg
          viewBox="0 0 20 20"
          className="size-4 shrink-0 text-ink-subtle"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path d="M7 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </>
  );

  const cls = 'flex min-h-touch items-center gap-3 border-b border-line py-3 last:border-b-0';
  return href ? (
    <Link href={href} className={`${cls} pressable -mx-2 rounded-lg px-2 hover:bg-surface-sunken/60`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

/**
 * 설정·메뉴 한 줄.
 *
 * 목업의 메뉴는 카드 하나 안에 아이콘 + 라벨 + 값으로 선다.
 * 아직 없는 기능은 링크로 두지 않는다 — 눌러서 아무 데도 안 가면 고장으로 읽힌다.
 * '준비 중' 이라고 적고 누를 수 없게 두는 편이 정확하다.
 */
export function MenuRow({
  href,
  icon,
  label,
  value,
  trailing,
  disabled,
  external,
}: {
  href?: ComponentProps<typeof Link>['href'];
  /** 왼쪽 보라 아이콘. 24×24 뷰박스 path 하나 */
  icon?: ReactNode;
  label: ReactNode;
  /** 오른쪽에 붙는 현재 값 */
  value?: ReactNode;
  /** 값 대신 넣을 것 (배지 등). 없으면 화살표가 들어간다 */
  trailing?: ReactNode;
  disabled?: boolean;
  /**
   * next/link 가 아니라 평범한 `<a>` 로 그린다.
   * 파일 다운로드처럼 **브라우저가 직접 처리해야 하는 응답**에 쓴다 —
   * Link 는 클라이언트 내비게이션을 시도해서 다운로드가 시작되지 않는다.
   */
  external?: boolean;
}) {
  const content = (
    <>
      {icon ? (
        <span aria-hidden className="flex size-6 shrink-0 items-center justify-center text-brand-ink">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate text-body-lg">{label}</span>
      {value ? <span className="shrink-0 text-body font-semibold text-brand-ink">{value}</span> : null}
      {trailing ?? (
        <svg
          viewBox="0 0 20 20"
          className="size-4 shrink-0 text-ink-subtle"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path d="M7 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </>
  );

  const cls = 'flex min-h-touch items-center gap-3 border-b border-line px-4 py-3.5 last:border-b-0';

  return (
    <li>
      {href && !disabled && external ? (
        <a href={String(href)} className={`${cls} pressable text-ink hover:bg-surface-sunken/60`}>
          {content}
        </a>
      ) : href && !disabled ? (
        <Link href={href} className={`${cls} pressable text-ink hover:bg-surface-sunken/60`}>
          {content}
        </Link>
      ) : (
        <div className={`${cls} text-ink-muted`} aria-disabled>
          {content}
        </div>
      )}
    </li>
  );
}
