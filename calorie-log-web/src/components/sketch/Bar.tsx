import React from 'react';
import { SketchBox } from './SketchBox';
import { INK, SOFT } from './_util';

export interface BarProps {
  value: number;
  max: number;
  /** Bar width. Default 28. */
  w?: number;
  /** Chart height. Default 100. */
  h?: number;
  /** Fill color for hatch. Default ink. */
  color?: string;
  label?: string;
  seed?: number;
}

/**
 * Single hatch-filled bar. Compose multiple inside a flex row for a chart.
 *
 * @example
 * <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
 *   {data.map((d, i) => <Bar key={i} value={d.v} max={3000} label={d.l}/> )}
 * </div>
 */
export const Bar: React.FC<BarProps> = ({
  value,
  max,
  w = 28,
  h = 100,
  color = INK,
  label,
  seed,
}) => {
  const barH = Math.max(6, (value / max) * h);
  const lines: React.ReactNode[] = [];
  for (let y = 2; y < barH - 1; y += 3) {
    lines.push(
      <line
        key={y}
        x1="3"
        y1={y}
        x2={w - 3}
        y2={y + 1.5}
        stroke={color}
        strokeWidth={1.4}
        opacity={0.85}
      />,
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ height: h, display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ position: 'relative', width: w, height: barH }}>
          <SketchBox r={4} sw={1.4} seed={seed ?? value} />
          <svg width={w} height={barH} style={{ position: 'absolute', inset: 0 }}>
            {lines}
          </svg>
        </div>
      </div>
      {label && <div className="mono" style={{ fontSize: 10, color: SOFT }}>{label}</div>}
    </div>
  );
};
