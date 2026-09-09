'use client';

import type { ComponentProps, ReactNode } from 'react';
import { useId } from 'react';

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-body font-bold text-ink">
        {label}
      </label>
      {hint ? <p className="mt-1 text-label text-ink-muted">{hint}</p> : null}
      <div className="mt-2">{children(id)}</div>
    </div>
  );
}

const inputCls =
  'h-12 w-full rounded-control border border-line-input bg-surface px-4 text-body-lg text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none';

export function TextInput({ className = '', ...props }: ComponentProps<'input'>) {
  return <input className={`${inputCls} ${className}`} {...props} />;
}

/** 숫자 전용. 모바일에서 숫자 키패드가 뜨게 한다 (PRD §10.3) */
export function NumberInput({ className = '', ...props }: ComponentProps<'input'>) {
  return (
    <input
      inputMode="numeric"
      autoComplete="off"
      className={`${inputCls} tabular ${className}`}
      {...props}
    />
  );
}

export type Option<T extends string> = { value: T; label: string; hint?: string };

/** 가로로 붙은 선택지. 3개 이하일 때 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`h-11 flex-1 rounded-control border text-body font-semibold transition-colors ${
            value === opt.value
              ? 'border-brand bg-brand-soft text-brand-ink'
              : 'border-line-strong bg-surface text-ink'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** 세로로 쌓인 선택지. 설명이 필요할 때 */
export function ChoiceList<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: readonly Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="space-y-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`w-full rounded-control border px-4 py-3.5 text-left transition-colors ${
            value === opt.value ? 'border-brand bg-brand-soft' : 'border-line-strong bg-surface'
          }`}
        >
          <span className={`block text-body font-bold ${value === opt.value ? 'text-brand-ink' : 'text-ink'}`}>
            {opt.label}
          </span>
          {opt.hint ? <span className="mt-0.5 block text-label text-ink-muted">{opt.hint}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** 스텝 진행 표시 (PRD §10.3) */
export function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={`${total}단계 중 ${step}단계`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-brand' : 'bg-brand-soft'}`}
        />
      ))}
    </div>
  );
}
