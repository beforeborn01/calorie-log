import React from 'react';
import { INK } from './_util';

export interface RingChartProps {
  /** Outer size. Default 200. */
  size?: number;
  /** Progress 0..1. */
  pct: number;
  /** Ring stroke width. Default 18. */
  stroke?: number;
  /** Fill color. Default var(--accent). */
  color?: string;
  /** Centered content (typically number + unit). */
  center?: React.ReactNode;
}

/**
 * Hand-drawn ring progress chart. Double outline + dashed baseline + scribble fill.
 * Use as the hero element on HomePage / GoalSetup.
 *
 * @example
 * <RingChart size={240} pct={0.62} center={<>
 *   <div className="mono" style={{ fontSize: 44 }}>1,842</div>
 *   <div className="mono ink-soft">/ 2,950 KCAL</div>
 * </>} />
 */
export const RingChart: React.FC<RingChartProps> = ({
  size = 200,
  pct,
  stroke = 18,
  color = 'var(--accent)',
  center,
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        {/* outer + inner sketch rings */}
        <circle cx={size / 2} cy={size / 2} r={r + stroke / 2}
          stroke={INK} strokeWidth={1.2} fill="none" opacity={0.55} />
        <circle cx={size / 2} cy={size / 2} r={r - stroke / 2}
          stroke={INK} strokeWidth={1.2} fill="none" opacity={0.55} />
        {/* dashed baseline ring */}
        <circle cx={size / 2} cy={size / 2} r={r}
          stroke={INK} strokeWidth={1.5} fill="none"
          strokeDasharray="3 5" opacity={0.35} />
        {/* fill */}
        <circle cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c * clamped} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          opacity={0.9} />
        {/* hatch texture */}
        <circle cx={size / 2} cy={size / 2} r={r}
          stroke="rgba(0,0,0,0.12)" strokeWidth={stroke} fill="none"
          strokeDasharray={`1 ${(c * clamped) / 40}`}
          strokeDashoffset={-c * clamped}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ mixBlendMode: 'multiply' }} />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {center}
      </div>
    </div>
  );
};
