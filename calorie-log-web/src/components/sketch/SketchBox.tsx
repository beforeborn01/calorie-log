import React from 'react';
import { INK, rand } from './_util';

export interface SketchBoxProps {
  /** Corner radius. Default 10. */
  r?: number;
  /** Stroke color. Default ink. */
  stroke?: string;
  /** Fill color. Default transparent. */
  fill?: string;
  /** Stroke width. Default 2. */
  sw?: number;
  /** Dash pattern e.g. "5 4". */
  dash?: string;
  /** Seed for deterministic jitter. */
  seed?: number;
  style?: React.CSSProperties;
}

/**
 * Hand-drawn rectangle, absolutely positioned to stretch to its
 * parent (which MUST be `position: relative`). Use as the visual
 * border for cards, buttons, pills etc.
 *
 * @example
 * <div style={{ position: 'relative', padding: 16 }}>
 *   <SketchBox r={12} />
 *   <span style={{ position: 'relative' }}>Content</span>
 * </div>
 */
export const SketchBox: React.FC<SketchBoxProps> = ({
  r = 10,
  stroke = INK,
  fill = 'transparent',
  sw = 2,
  dash,
  seed = 1,
  style,
}) => (
  <svg
    width="100%"
    height="100%"
    preserveAspectRatio="none"
    style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      ...style,
    }}
  >
    <rect
      x="1.5"
      y="1.5"
      width="calc(100% - 3px)"
      height="calc(100% - 3px)"
      rx={r}
      ry={r}
      fill={fill}
      stroke={stroke}
      strokeWidth={sw}
      strokeDasharray={dash}
      style={{ filter: 'url(#rough-1)' }}
      data-seed={seed}
    />
  </svg>
);

export interface SketchCircleProps {
  size: number;
  stroke?: string;
  fill?: string;
  sw?: number;
  seed?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/** Hand-drawn circle container, sized explicitly. */
export const SketchCircle: React.FC<SketchCircleProps> = ({
  size,
  stroke = INK,
  fill = 'transparent',
  sw = 2,
  seed = 1,
  style,
  children,
}) => {
  const r = size / 2;
  let s = seed;
  const j = () => (rand(s++) - 0.5) * 1.2;
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    pts.push([r + Math.cos(a) * r + j(), r + Math.sin(a) * r + j()]);
  }
  const d =
    'M ' +
    pts.map((p, i) => (i === 0 ? p.join(' ') : 'L ' + p.join(' '))).join(' ') +
    ' Z';
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        ...style,
      }}
    >
      <svg
        width={size + 4}
        height={size + 4}
        style={{ position: 'absolute', inset: -2, overflow: 'visible' }}
      >
        <path
          d={d}
          transform="translate(2,2)"
          stroke={stroke}
          strokeWidth={sw}
          fill={fill}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * Inject this filter ONCE at the root of your app (e.g. in App.tsx)
 * so SketchBox strokes pick up the rough displacement effect.
 */
export const SketchFilters: React.FC = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
    <filter id="rough-1">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={2} seed={2} />
      <feDisplacementMap in="SourceGraphic" scale="1.1" />
    </filter>
  </svg>
);
