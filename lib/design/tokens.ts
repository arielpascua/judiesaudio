// Design tokens. Chalk paper and ink, a cobalt signal colour and an amber
// "peak" colour borrowed from a level meter. Every text pairing below is checked
// against WCAG AA (4.5:1) by tokens.test.ts.

export const COLOURS = {
  chalk: '#EEF0EB',
  chalkDeep: '#E2E5DD',
  ink: '#12151A',
  inkMuted: '#4F565E',
  cobalt: '#2433CC',
  cobaltDark: '#18249A',
  graphite: '#1B2026',
  amber: '#FFB000',
  line: '#C5CABF',
  white: '#FFFFFF',
} as const;

export type ColourToken = keyof typeof COLOURS;

export const TEXT_PAIRS: { name: string; fg: ColourToken; bg: ColourToken }[] = [
  { name: 'ink on chalk', fg: 'ink', bg: 'chalk' },
  { name: 'muted ink on chalk', fg: 'inkMuted', bg: 'chalk' },
  { name: 'ink on deep chalk', fg: 'ink', bg: 'chalkDeep' },
  { name: 'muted ink on deep chalk', fg: 'inkMuted', bg: 'chalkDeep' },
  { name: 'chalk on cobalt (buttons)', fg: 'chalk', bg: 'cobalt' },
  { name: 'chalk on dark cobalt (button hover)', fg: 'chalk', bg: 'cobaltDark' },
  { name: 'cobalt on chalk (links)', fg: 'cobalt', bg: 'chalk' },
  { name: 'chalk on ink', fg: 'chalk', bg: 'ink' },
  { name: 'chalk on graphite', fg: 'chalk', bg: 'graphite' },
  { name: 'amber on graphite (peak readouts)', fg: 'amber', bg: 'graphite' },
  { name: 'amber on ink', fg: 'amber', bg: 'ink' },
  { name: 'ink on amber (signal buttons)', fg: 'ink', bg: 'amber' },
  { name: 'muted ink on white (search placeholder)', fg: 'inkMuted', bg: 'white' },
];

// WCAG 1.4.11: the boundary of a form field must reach 3:1 against its surround.
// The decorative `line` hairline does not, so fields use muted ink instead.
export const NON_TEXT_PAIRS: { name: string; fg: ColourToken; bg: ColourToken }[] = [
  { name: 'search field border (muted ink) on white', fg: 'inkMuted', bg: 'white' },
];

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
