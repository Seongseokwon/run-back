import Image from 'next/image';
import type { ReactNode } from 'react';
import { ILLUSTRATIONS, type IllustrationName } from '@/lib/illustrations';

/** 앱 셸 최대 폭이 max-w-md(448px)라 그보다 큰 이미지를 받아 올 이유가 없다 */
const SIZES = '(max-width: 448px) 100vw, 448px';

/**
 * 씬을 면으로 깔고 그 위에 내용을 얹는다.
 *
 * 아트워크의 위쪽 절반은 비어 있는 하늘이고 배경색이 크림 캔버스와 거의 같다.
 * 그래서 그림을 구석에 작게 붙이는 대신 **바탕으로 깔고 하늘에 글자를 올린다.**
 *
 * `object-bottom` 인 이유: 씬의 정보(러너·길·언덕)는 전부 아래쪽에 있다.
 * 위를 잘라 내면 그림이 사라지고, 아래를 잘라 내면 하늘만 남는다.
 *
 * 글자 뒤에는 옅은 크림 스크림을 깐다. 지금 아트워크의 하늘은 충분히 밝지만,
 * 나중에 어두운 씬이 들어와도 본문 대비가 무너지지 않게 하는 보험이다.
 */
export function SceneSurface({
  name,
  children,
  className = '',
  minHeight,
}: {
  name: IllustrationName;
  children: ReactNode;
  className?: string;
  /** px. 하늘을 얼마나 남길지 — 내용이 길수록 키운다 */
  minHeight: number;
}) {
  const slot = ILLUSTRATIONS[name];

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ minHeight }}>
      {/*
        z-index 를 쓰지 않는다. 절대 배치된 이미지는 컨테이너 자신의 배경보다 위에,
        뒤따라오는 relative 자식보다 아래에 그려진다 — 그 순서만으로 충분하다.
        음수 z-index 를 주면 카드 배경(bg-surface-raised) 뒤로 숨어서 그림이 사라진다.
      */}
      {slot.src ? (
        <>
          <Image
            src={slot.src}
            alt=""
            aria-hidden
            fill
            sizes={SIZES}
            className="object-cover object-bottom select-none"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-canvas/85 via-canvas/35 to-transparent"
          />
        </>
      ) : null}
      <div className="relative">{children}</div>
    </div>
  );
}

/**
 * 씬을 한 줄 띠로 깔아 둔다. 위에 글자를 얹지 않고 그림만 보여 줄 때 쓴다.
 *
 * `aspect` 를 원본(3:2)보다 납작하게 주면 **아래쪽을 남기고 하늘을 잘라 낸다.**
 * 이 아트워크는 위쪽 60%가 빈 하늘이라 원본 비율 그대로 깔면 화면에는
 * 빈 크림만 크게 보인다 — 정보도 정취도 전부 아래쪽에 있다.
 */
export function SceneBand({
  name,
  className = '',
  rounded = true,
  aspect,
}: {
  name: IllustrationName;
  className?: string;
  rounded?: boolean;
  /** width / height. 생략하면 원본 비율 */
  aspect?: number;
}) {
  const slot = ILLUSTRATIONS[name];
  const ratio = aspect ?? slot.ratio;
  const radius = rounded ? 'rounded-card' : '';

  if (!slot.src) {
    return (
      <div
        aria-hidden
        style={{ aspectRatio: ratio }}
        className={`w-full bg-surface-sunken/60 ${radius} ${className}`}
      />
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden ${radius} ${className}`}
      style={{ aspectRatio: ratio }}
    >
      <Image
        src={slot.src}
        alt=""
        aria-hidden
        fill
        sizes={SIZES}
        className={`object-cover select-none ${ratio > slot.ratio ? 'object-bottom' : ''}`}
      />
    </div>
  );
}

/**
 * 원형 아바타.
 *
 * `<Image width height>` 로 정사각을 만들 수 없다 — Tailwind preflight 의
 * `img { height: auto }` 가 height 속성을 이겨서 원본 비율(3:2)로 눕는다.
 * 그래서 크기는 바깥 상자가 잡고 이미지는 `fill` 로 채운다.
 *
 * 초점은 가운데가 아니라 **오른쪽 아래**의 언덕과 해다. 씬 한가운데는 빈 하늘이라
 * 그대로 자르면 아무것도 없는 원이 나오고, 러너 쪽을 잡으면 이 크기에서는
 * 발치만 걸려서 뭔지 알아볼 수 없다. 목업의 아바타도 인물이 아니라 풍경이었다.
 */
export function SceneAvatar({ name, size }: { name: IllustrationName; size: number }) {
  const slot = ILLUSTRATIONS[name];

  return (
    <div
      aria-hidden
      style={{ width: size, height: size }}
      className="relative shrink-0 overflow-hidden rounded-full border border-line bg-surface-sunken"
    >
      {slot.src ? (
        <Image
          src={slot.src}
          alt=""
          fill
          sizes={`${size}px`}
          className="object-cover object-[72%_74%] select-none"
        />
      ) : null}
    </div>
  );
}
