import Link from 'next/link';
import type { CSSProperties } from 'react';
import { PLOT, formatHz, tracePath, xOf, yOf, TICKS } from '@/components/art/response-math';

// The hero is a composition, not a photograph: a multi-bar level meter and a
// drawn response trace on a graphite panel, beside the headline. CSS and SVG
// only. The bars move on a loop and the trace draws itself once; both settle to
// a still frame under prefers-reduced-motion (globals.css). The whole panel is
// decorative (aria-hidden) and labelled "Illustration" so nobody reads it as a
// live measurement. The trace itself is a real model's curve, drawn from its
// -10 dB points.

const BAR_COUNT = 28;

/** Deterministic per-bar motion values, so server and client render the same markup. */
function barStyle(i: number): CSSProperties {
  const wave = (n: number, k: number) => (Math.sin(i * n + k) + 1) / 2; // 0..1
  const hi = 6 + Math.round(wave(0.9, 0.4) * 30); // top inset when loud (%)
  const lo = 48 + Math.round(wave(1.7, 1.1) * 38); // top inset when quiet (%)
  const rest = Math.round((hi + lo) / 2);
  const dur = (1.6 + wave(2.3, 0.2) * 1.8).toFixed(2);
  const delay = (-wave(3.1, 0.7) * 3).toFixed(2);
  return { ['--hi' as string]: `${hi}%`, ['--lo' as string]: `${lo}%`, ['--rest' as string]: `${rest}%`, ['--dur' as string]: `${dur}s`, ['--delay' as string]: `${delay}s` };
}

export interface HeroTrace {
  name: string;
  lowHz: number;
  highHz: number;
}

function SignalPanel({ trace }: { trace: HeroTrace | null }) {
  const curve = trace ? tracePath(trace.lowHz, trace.highHz) : null;
  const { width, height, left, right, top, bottom } = PLOT;
  const plotBottom = height - bottom;
  return (
    <div className="on-dark grid-paper border border-ink bg-graphite p-4 text-chalk sm:p-6" aria-hidden="true">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Signal · illustration</span>
        <span className="eyebrow">Level · dB</span>
      </div>

      <div className="mt-4 flex h-44 items-stretch gap-[3px] sm:h-52">
        {Array.from({ length: BAR_COUNT }, (_, i) => (
          <span key={i} className="led-bar block flex-1 text-chalk" style={barStyle(i)} />
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-widest text-chalk/70">
        <span>−48</span><span>−24</span><span>−12</span><span>−6</span><span>0 dB</span>
      </div>

      <div className="mt-6 border-t border-chalk/25 pt-4">
        {curve && trace ? (
          <>
            <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" focusable="false">
              <g stroke="#EEF0EB" strokeWidth={0.7} opacity={0.28}>
                {TICKS.map((t) => <line key={t.hz} x1={xOf(t.hz)} x2={xOf(t.hz)} y1={top} y2={plotBottom} />)}
                {[0, -10, -20, -30, -40].map((db) => <line key={db} x1={left} x2={width - right} y1={yOf(db)} y2={yOf(db)} />)}
              </g>
              <path
                d={curve.d}
                fill="none"
                stroke="#EEF0EB"
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
                className="trace-draw"
                style={{ ['--trace-length' as string]: curve.length }}
              />
            </svg>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-chalk/80">
              {trace.name} · −10 dB at {formatHz(trace.lowHz)} and {formatHz(trace.highHz)}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function Hero({ trace }: { trace: HeroTrace | null }) {
  return (
    <section className="relative border-b border-ink" aria-labelledby="hero-title">
      <div className="container-page grid items-center gap-10 py-12 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-20">
        <div>
          <p className="eyebrow">Commercial audio for business</p>
          <h1 id="hero-title" className="mt-5 text-[3.25rem] leading-[0.98] sm:text-7xl lg:text-[5.5rem]">
            Commercial audio, <em className="text-cobalt">specified</em> on the datasheet.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
            Speakers, subwoofers, amplifiers, processors and complete systems for restaurants, shops,
            hotels, churches, schools and halls. Read each model’s numbers, then send us an inquiry.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="btn-primary">Browse the datasheets</Link>
            <Link href="/inquiry" className="btn-quiet">Send an inquiry</Link>
          </div>
        </div>
        <SignalPanel trace={trace} />
      </div>
      <div className="tick-rule text-ink" aria-hidden="true" />
    </section>
  );
}
