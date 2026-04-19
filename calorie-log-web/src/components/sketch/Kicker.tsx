import React from 'react';

export interface KickerProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Small uppercase monospace label — like a section anchor or tag.
 * Use above section titles and kicker rows.
 *
 * @example
 * <Kicker>TODAY · 今日</Kicker>
 * <h1 className="display">增肌 · 蛋白优先</h1>
 */
export const Kicker: React.FC<KickerProps> = ({ children, className, style }) => (
  <div
    className={`mono ${className ?? ''}`}
    style={{
      fontSize: 11,
      letterSpacing: 2,
      color: 'var(--ink-soft)',
      textTransform: 'uppercase',
      ...style,
    }}
  >
    {children}
  </div>
);

export interface ChipProps {
  children?: React.ReactNode;
  color?: string;
  style?: React.CSSProperties;
}

/**
 * Tiny highlight chip — for tags like "高蛋白", "早餐", "训练日".
 * Uses a solid tint rather than a sketch border for a lighter feel.
 */
export const Chip: React.FC<ChipProps> = ({ children, color, style }) => (
  <span
    className="hand"
    style={{
      display: 'inline-block',
      padding: '2px 8px',
      background: color ?? 'oklch(0.94 0.06 195)',
      borderRadius: 'var(--r-sm)',
      fontSize: 12,
      fontWeight: 700,
      color: 'var(--ink)',
      ...style,
    }}
  >
    {children}
  </span>
);
