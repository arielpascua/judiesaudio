import Link from 'next/link';
import { SITE_NAME } from '@/lib/site';

// A typographic mark: a five-bar level-meter glyph (one amber peak lamp) beside
// "Judie's" in the display serif and "AUDIO" as a mono engraving.

const BARS = [8, 14, 20, 12, 17];

export function WordmarkGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 24" width={28} height={24} aria-hidden="true" focusable="false" className={className}>
      {BARS.map((h, i) => (
        <rect key={i} x={1 + i * 5.4} y={22 - h} width={3.4} height={h} fill="currentColor" />
      ))}
      <rect x={1 + 2 * 5.4} y={2} width={3.4} height={3} fill="#FFB000" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <Link href="/" className="flex min-h-[44px] items-center gap-2.5 text-ink" aria-label={`${SITE_NAME} home`}>
      <WordmarkGlyph />
      <span className="flex items-baseline gap-2 leading-none">
        <span className="font-display text-[26px] tracking-tight">Judie’s</span>
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.28em]">Audio</span>
      </span>
    </Link>
  );
}
