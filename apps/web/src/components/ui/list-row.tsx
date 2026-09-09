import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

/** 세션 완료 상태 — PRD F-12 주차 완료 체크 */
export type RowStatus = 'done' | 'todo' | 'rest';

function StatusMark({ status }: { status: RowStatus }) {
  if (status === 'rest') {
    return <span aria-hidden className="block h-px w-3.5 rounded-full bg-ink-subtle" />;
  }
  if (status === 'done') {
    return (
      <span
        aria-hidden
        className="flex size-6 items-center justify-center rounded-full bg-brand text-on-brand"
      >
        <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={3}>
          <path d="M4 10.5l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  return <span aria-hidden className="block size-6 rounded-full border-2 border-line-input" />;
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
      {href && !disabled ? (
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
