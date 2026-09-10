import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

const base =
  'pressable flex w-full items-center justify-center gap-2 rounded-control px-5 text-body-lg font-bold disabled:pointer-events-none disabled:opacity-35';

/** 높이는 터치 타깃 최소치(44px) 아래로 내려가지 않는다 */
const sizes = { sm: 'h-11', md: 'h-12', lg: 'h-14' } as const;

const variants = {
  primary: 'bg-brand text-on-brand hover:bg-brand-strong',
  /** 보라 면 카드 안의 버튼. 배경이 이미 보라라 흰 면으로 뒤집는다 */
  onBrand: 'bg-on-brand text-brand-deep hover:bg-on-brand-muted',
  /** 보라 테두리에 투명 배경. 주 버튼과 경쟁하지 않는 실행 버튼 */
  outline: 'border-2 border-brand bg-transparent text-brand-ink hover:bg-brand-soft/50',
  soft: 'bg-brand-soft text-brand-ink hover:bg-brand-soft/70',
  ghost: 'border border-line-strong bg-transparent text-ink hover:bg-surface-sunken',
  /**
   * 카카오 로그인 전용. 색과 문구는 카카오 디자인 가이드가 정한 것이라 우리가 못 바꾼다.
   * className 으로 덮지 말 것 — bg-brand 와 bg-kakao 는 특이도가 같아서
   * 어느 쪽이 이길지는 생성된 CSS 순서에 달린다. variant 로 갈라야 확정된다.
   */
  kakao: 'bg-kakao text-on-kakao hover:bg-kakao/85',
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
