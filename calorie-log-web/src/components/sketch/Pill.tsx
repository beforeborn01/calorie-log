import React from 'react';
import { SketchBox } from './SketchBox';

export interface PillProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  active?: boolean;
  children?: React.ReactNode;
}

/**
 * Pill-shaped tab. Use for meal switchers, filter chips.
 *
 * @example
 * <Pill active>早餐</Pill> <Pill>午餐</Pill>
 */
export const Pill: React.FC<PillProps> = ({ active, children, style, ...rest }) => (
  <button
    {...rest}
    style={{
      position: 'relative',
      height: 34,
      padding: '0 16px',
      background: active ? 'var(--accent-soft)' : 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'Kalam, sans-serif',
      fontSize: 14,
      fontWeight: active ? 700 : 400,
      color: active ? 'var(--ink)' : 'var(--ink-soft)',
      ...style,
    }}
  >
    <SketchBox r={17} sw={active ? 2 : 1.4} seed={String(children ?? '').length + 3} />
    <span style={{ position: 'relative' }}>{children}</span>
  </button>
);
