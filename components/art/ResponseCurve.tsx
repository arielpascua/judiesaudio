import {
  DB_LINES, GRID_FREQS, PLOT, TICKS, formatHz, responseDb, tracePath, xOf, yOf,
} from './response-math';

// A frequency-response graph drawn from a product's datasheet numbers.
//
// The x axis is logarithmic (20 Hz to 20 kHz), the y axis is level in dB with the
// passband at 0 dB. The trace is generated from lowHz / highHz (the -10 dB points)
// by response-math.ts, so no point on it is decorative. It is an idealised nominal
// curve, not a measurement, and the caption says so.
//
// A product that makes no sound (an amplifier, a processor) has null lowHz/highHz.
// It gets an honest "not applicable" panel, never a made-up curve.

export interface ResponseCurveProps {
  lowHz: number | null;
  highHz: number | null;
  /** Product name, used in the accessible name. */
  name: string;
  className?: string;
}

const READ_AT = [20, 50, 100, 500, 1000, 5000, 10_000, 20_000];

export function ResponseCurve({ lowHz, highHz, name, className = '' }: ResponseCurveProps) {
  if (lowHz === null || highHz === null) {
    return (
      <figure className={`border border-line bg-white p-5 ${className}`}>
        <figcaption className="eyebrow">Frequency response</figcaption>
        <p role="note" className="mt-4 font-mono text-sm">
          Not applicable: this product does not produce sound.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          {name} handles the signal ahead of the speakers, so a frequency-response curve would say nothing about it.
        </p>
      </figure>
    );
  }

  const { d, length } = tracePath(lowHz, highHz);
  const { width, height, left, right, top, bottom } = PLOT;
  const plotBottom = height - bottom;
  const titleId = `curve-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;

  return (
    <figure className={`border border-line bg-white p-4 sm:p-5 ${className}`}>
      <figcaption className="eyebrow">Frequency response</figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby={titleId}
        className="mt-3 h-auto w-full"
        focusable="false"
      >
        <title id={titleId}>{`Nominal frequency response of ${name}: -10 dB at ${formatHz(lowHz)} and at ${formatHz(highHz)}, drawn from the datasheet.`}</title>

        {/* Graticule: minor frequency lines, then decade lines, then the dB lines. */}
        <g stroke="#C5CABF" strokeWidth={0.6}>
          {GRID_FREQS.map((hz) => <line key={hz} x1={xOf(hz)} x2={xOf(hz)} y1={top} y2={plotBottom} opacity={0.55} />)}
        </g>
        <g stroke="#9AA093" strokeWidth={0.8}>
          {TICKS.map((t) => <line key={t.hz} x1={xOf(t.hz)} x2={xOf(t.hz)} y1={top} y2={plotBottom} />)}
          {DB_LINES.map((db) => <line key={db} x1={left} x2={width - right} y1={yOf(db)} y2={yOf(db)} strokeDasharray={db === 0 ? undefined : '2 3'} />)}
        </g>
        <rect x={left} y={top} width={width - left - right} height={plotBottom - top} fill="none" stroke="#12151A" strokeWidth={1} />

        {/* Axis labels. */}
        <g className="font-mono" fontSize={11} fill="#4F565E">
          {TICKS.map((t) => (
            <text key={t.hz} x={xOf(t.hz)} y={plotBottom + 16} textAnchor="middle">{t.label}</text>
          ))}
          <text x={width - right} y={height - 4} textAnchor="end">Hz</text>
          {DB_LINES.map((db) => (
            <text key={db} x={left - 8} y={yOf(db) + 4} textAnchor="end">{db}</text>
          ))}
          <text x={4} y={top + 8} textAnchor="start">dB</text>
        </g>

        {/* The -10 dB points the curve is built from. */}
        <g stroke="#2433CC" strokeWidth={1} strokeDasharray="3 3">
          <line x1={xOf(lowHz)} x2={xOf(lowHz)} y1={yOf(-10)} y2={plotBottom} />
          <line x1={xOf(highHz)} x2={xOf(highHz)} y1={yOf(-10)} y2={plotBottom} />
        </g>
        <g fill="#2433CC">
          <circle cx={xOf(lowHz)} cy={yOf(-10)} r={3.5} />
          <circle cx={xOf(highHz)} cy={yOf(-10)} r={3.5} />
        </g>

        {/* The trace draws itself once (globals.css .trace-draw; static under reduced motion). */}
        <path
          d={d}
          fill="none"
          stroke="#2433CC"
          strokeWidth={2.4}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="trace-draw"
          style={{ ['--trace-length' as string]: length }}
        />
      </svg>

      <p className="mt-3 font-mono text-xs text-ink">
        <span className="readout">−10 dB at {formatHz(lowHz)} and {formatHz(highHz)}</span>
      </p>
      <p className="mt-1 text-xs text-ink-muted">
        Idealised from the two −10 dB points on this datasheet. It is not a measurement of a unit.
      </p>

      <div className="sr-only">
      <table>
        <caption>{`Nominal level of ${name} at selected frequencies, in dB relative to the passband`}</caption>
        <thead>
          <tr><th scope="col">Frequency</th><th scope="col">Level (dB)</th></tr>
        </thead>
        <tbody>
          {READ_AT.map((hz) => (
            <tr key={hz}>
              <th scope="row">{formatHz(hz)}</th>
              <td>{responseDb(hz, lowHz, highHz).toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  );
}
