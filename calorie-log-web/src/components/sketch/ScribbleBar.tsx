import React from 'react';
import { SketchBox } from './SketchBox';

export interface ScribbleBarProps {
  /** Width (px or %). Default 100%. */
  w?: number | string;
  /** Height. Default 14. */
  h?: number;
  /** Progress 0..1. */
  pct: number;
  /** Fill color. Default var(--accent). */
  color?: string;
  seed?: number;
}

/**
 * Progress bar filled with diagonal pencil scribbles rather than a solid block.
 * Use for macros, goal progress, streaks.
 *
 * @example
 * <ScribbleBar pct={0.68} color="var(--protein)" />
 */
export const ScribbleBar: React.FC<ScribbleBarProps> = ({
  w = '100%',
  h = 14,
  pct,
  color = 'var(--accent)',
  seed = 1,
}) => {
  const clip = `inset(0 ${100 - Math.max(0, Math.min(1, pct)) * 100}% 0 0)`;
  const lines: React.ReactNode[] = [];
  for (let y = 2; y < h - 1; y += 2.8) {
    lines.push(
      <line
        key={y}
        x1="3"
        y1={y}
        x2="100%"
        y2={y + 1.5}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.9}
      />,
    );
  }
  return (
    <div style={{ position: 'relative', width: w, height: h }}>
      <SketchBox r={h / 2} sw={1.5} seed={seed} />
      <svg
        width="100%"
        height={h}
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: clip,
          WebkitClipPath: clip,
        }}
      >
        {lines}
      </svg>
    </div>
  );
};
