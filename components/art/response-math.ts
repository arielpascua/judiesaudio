// The maths behind <ResponseCurve>. Pure functions, no React, so the curve can be
// unit-tested against the datasheet numbers it is drawn from.
//
// The trace is an IDEALISED nominal response: a flat passband with a 4th-order
// (24 dB per octave) Butterworth roll-off at each end, scaled so the level is
// exactly -10 dB at the product's lowHz and highHz. It is drawn from those two
// datasheet numbers only. It is not a measurement and the page says so.

export const F_MIN = 20;
export const F_MAX = 20_000;
export const DB_TOP = 5;
export const DB_BOTTOM = -40;
/** Roll-off order of each Butterworth section (2n = 4 -> 24 dB/octave). */
const ORDER = 2;
/** The datasheet bandwidth is quoted at -10 dB. */
export const BANDWIDTH_DB = -10;

/** Nominal level in dB (0 dB = passband) at `hz` for a product with -10 dB points lowHz and highHz. */
export function responseDb(hz: number, lowHz: number, highHz: number): number {
  // |H|^2 = 1 / (1 + (fc/f)^(2n)); -10 dB means (fc/f)^(2n) = 9, so fc = f10 * 9^(1/(2n)).
  const k = 9 ** (1 / (2 * ORDER));
  const fcLow = lowHz * k;
  const fcHigh = highHz / k;
  const high = 1 / (1 + (fcLow / hz) ** (2 * ORDER));
  const low = 1 / (1 + (hz / fcHigh) ** (2 * ORDER));
  return 10 * Math.log10(high * low);
}

export interface Plot {
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export const PLOT: Plot = { width: 640, height: 300, left: 52, right: 16, top: 16, bottom: 36 };

const span = Math.log10(F_MAX) - Math.log10(F_MIN);

export function xOf(hz: number, p: Plot = PLOT): number {
  const t = (Math.log10(hz) - Math.log10(F_MIN)) / span;
  return p.left + t * (p.width - p.left - p.right);
}

export function yOf(db: number, p: Plot = PLOT): number {
  const t = (DB_TOP - db) / (DB_TOP - DB_BOTTOM);
  return p.top + Math.min(1, Math.max(0, t)) * (p.height - p.top - p.bottom);
}

export interface Trace {
  d: string;
  length: number;
}

/** SVG path data for the trace, plus its length (for the stroke-dash draw-on animation). */
export function tracePath(lowHz: number, highHz: number, steps = 120): Trace {
  let d = '';
  let length = 0;
  let px = 0;
  let py = 0;
  for (let i = 0; i <= steps; i++) {
    const hz = F_MIN * (F_MAX / F_MIN) ** (i / steps);
    const x = xOf(hz);
    const y = yOf(responseDb(hz, lowHz, highHz));
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    if (i > 0) length += Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return { d, length: Math.ceil(length) };
}

/** Frequencies labelled on the x axis and listed in the text alternative. */
export const TICKS: { hz: number; label: string }[] = [
  { hz: 20, label: '20' },
  { hz: 100, label: '100' },
  { hz: 1000, label: '1k' },
  { hz: 10_000, label: '10k' },
  { hz: 20_000, label: '20k' },
];

export const GRID_FREQS = [30, 40, 50, 60, 70, 80, 90, 200, 300, 400, 500, 600, 700, 800, 900, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000];
export const DB_LINES = [0, -10, -20, -30, -40];

export { formatHz } from '@/lib/shop/spec-format';
