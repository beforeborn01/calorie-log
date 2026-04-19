/**
 * Shared helpers + seeded randomness for deterministic hand-drawn paths.
 * Seed should be stable across renders so the sketch doesn't jitter.
 */

export const INK = '#1f1d1a';
export const SOFT = '#544f46';
export const FAINT = '#9a9285';
export const PAPER = '#faf7f1';

export function rand(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/** Deterministic jitter generator keyed by a starting seed. */
export function jitter(seed: number, amount = 1.3): () => number {
  let s = seed;
  return () => (rand(s++) - 0.5) * amount;
}

export type SketchProps = {
  /** Stroke color. Default: ink. */
  stroke?: string;
  /** Fill color. Default: transparent. */
  fill?: string;
  /** Stroke width. */
  sw?: number;
  /** Optional dash pattern e.g. "5 4". */
  dash?: string;
  /** Seed for deterministic jitter. */
  seed?: number;
};
