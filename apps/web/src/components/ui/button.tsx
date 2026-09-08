import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

const base =
  'pressable flex w-full items-center justify-center rounded-control px-5 text-[17px] font-bold disabled:pointer-events-none disabled:opacity-35';

/** 높이는 터치 타깃 최소치(44px) 아래로 내려가지 않는다 */
const sizes = { sm: 'h-11', md: 'h-12', lg: 'h-14' } as const;

const variants = {
  primary: 'bg-brand text-white hover:bg-brand-strong',
  /** 목업의 '훈련 기록하기' — 보라 테두리에 투명 배경. 주 버튼과 경쟁하지 않는 실행 버튼 */
  outline: 'border-2 border-brand bg-transparent text-brand-ink hover:bg-brand-soft/50',
  soft: 'bg-brand-soft text-brand-ink hover:bg-brand-soft/70',
  ghost: 'border border-line-strong bg-transparent text-ink hover:bg-surface-sunken',
} as const;

type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

export function Button({
  variant = 'primary',
  size = 'lg',
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'lg',
  className = '',
  children,
}: {
  href: ComponentProps<typeof Link>['href'];
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}
