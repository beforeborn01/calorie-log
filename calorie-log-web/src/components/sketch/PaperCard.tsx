import React from 'react';
import { SketchBox } from './SketchBox';

export interface PaperCardProps {
  children?: React.ReactNode;
  /** Border radius. Default 12. */
  r?: number;
  /** Stroke width. Default 2. */
  sw?: number;
  /** Dash pattern for "todo" / empty state cards. */
  dash?: string;
  /** Raised shadow for hovering cards. */
  raised?: boolean;
  /** Seed for sketch border jitter. */
  seed?: number;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Paper card — background + hard-offset shadow + hand-drawn border.
 * This is the primary container for all content blocks.
 *
 * @example
 * <PaperCard>
 *   <Kicker>TODAY</Kicker>
 *   <h2 className="display">今日能量</h2>
 * </PaperCard>
 */
export const PaperCard: React.FC<PaperCardProps> = ({
  children,
  r = 12,
  sw = 2,
  dash,
  raised = false,
  seed = 3,
  style,
  className,
}) => (
  <div
    className={className}
    style={{
      position: 'relative',
      background: 'var(--paper)',
      borderRadius: r,
      padding: 18,
      boxShadow: raised ? 'var(--shadow-raised)' : 'var(--shadow-paper)',
      ...style,
    }}
  >
    <SketchBox r={r} sw={sw} dash={dash} seed={seed} />
    <div style={{ position: 'relative' }}>{children}</div>
  </div>
);
