import React from 'react';
import { SketchBox } from './SketchBox';

type Size = 'sm' | 'md' | 'lg';

export interface SketchButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  primary?: boolean;
  size?: Size;
  children?: React.ReactNode;
}

const H: Record<Size, number> = { sm: 32, md: 40, lg: 48 };
const PX: Record<Size, number> = { sm: 14, md: 18, lg: 22 };
const FS: Record<Size, number> = { sm: 13, md: 14, lg: 16 };

/**
 * Hand-drawn button. Primary = filled with accent-soft, otherwise outlined.
 * Replaces Antd <Button> in our design.
 *
 * @example
 * <SketchButton primary size="lg" onClick={save}>+ 添加食物</SketchButton>
 */
export const SketchButton: React.FC<SketchButtonProps> = ({
  primary,
  size = 'md',
  children,
  style,
  ...rest
}) => (
  <button
    {...rest}
    style={{
      position: 'relative',
      height: H[size],
      padding: `0 ${PX[size]}px`,
      background: primary ? 'var(--accent-soft)' : 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'Kalam, sans-serif',
      fontSize: FS[size],
      fontWeight: primary ? 700 : 400,
      color: 'var(--ink)',
      ...style,
    }}
  >
    <SketchBox r={H[size] / 2} sw={primary ? 2.2 : 1.6} seed={FS[size]} />
    <span style={{ position: 'relative' }}>{children}</span>
  </button>
);
