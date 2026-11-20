import type { ArtKind } from '@/lib/catalog/types';

// A schematic drawing of a product, built in SVG from its own specification
// (kind, finish colour, driver count and size). It is an illustration, never a
// photograph, and the site says so (IMAGE_DISCLOSURE). One component draws every
// product so the whole catalogue reads as one hand: blueprint linework over a
// flat finish colour, with registration crosses in the corners.

export interface ProductArtProps {
  art: ArtKind;
  /** The finish colour of the product, e.g. "#1B1D20". */
  finishHex: string;
  /** Number of drivers and the size of the main one in inches (used to scale the cones). */
  woofers?: number;
  wooferIn?: number;
  /** Accessible name. Omit for a decorative drawing (it is then hidden from assistive tech). */
  label?: string;
  className?: string;
}

const LINE = '#12151A';
const LINE_ON_DARK = '#EEF0EB';
const AMBER = '#FFB000';

/** Is this finish dark enough that the linework must flip to chalk to stay visible? */
function isDark(hex: string): boolean {
  const n = parseInt(hex.replace('#', ''), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum < 110;
}

function Cone({ cx, cy, r, line }: { cx: number; cy: number; r: number; line: string }) {
  return (
    <g fill="none" stroke={line} strokeWidth={1.4}>
      <circle cx={cx} cy={cy} r={r} />
      <circle cx={cx} cy={cy} r={r * 0.78} opacity={0.7} />
      <circle cx={cx} cy={cy} r={r * 0.5} opacity={0.7} />
      <circle cx={cx} cy={cy} r={r * 0.18} fill={line} stroke="none" />
    </g>
  );
}

function Crosses() {
  const marks = [
    [12, 12],
    [228, 12],
    [12, 228],
    [228, 228],
  ];
  return (
    <g stroke={LINE} strokeWidth={1} opacity={0.45}>
      {marks.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <line x1={x - 5} y1={y} x2={x + 5} y2={y} />
          <line x1={x} y1={y - 5} x2={x} y2={y + 5} />
        </g>
      ))}
    </g>
  );
}

function Body({ props }: { props: ProductArtProps }) {
  const { art, finishHex, woofers = 1, wooferIn = 8 } = props;
  const dark = isDark(finishHex);
  const line = dark ? LINE_ON_DARK : LINE;
  const edge = LINE;
  const fill = finishHex;
  const coneR = Math.min(62, 22 + wooferIn * 2.6);

  switch (art) {
    case 'cabinet':
      return (
        <g>
          <rect x={62} y={30} width={116} height={180} rx={7} fill={fill} stroke={edge} strokeWidth={2} />
          <circle cx={120} cy={66} r={13} fill="none" stroke={line} strokeWidth={1.4} />
          <circle cx={120} cy={66} r={5} fill={line} />
          <Cone cx={120} cy={142} r={Math.min(48, coneR)} line={line} />
          <rect x={98} y={196} width={44} height={5} rx={2.5} fill="none" stroke={line} strokeWidth={1.2} />
        </g>
      );
    case 'subwoofer':
      return (
        <g>
          <rect x={44} y={44} width={152} height={152} rx={7} fill={fill} stroke={edge} strokeWidth={2} />
          <Cone cx={120} cy={110} r={Math.min(56, coneR)} line={line} />
          <rect x={80} y={176} width={80} height={9} rx={4.5} fill="none" stroke={line} strokeWidth={1.3} />
        </g>
      );
    case 'column': {
      const rows = Math.max(2, Math.min(16, woofers));
      const top = 22;
      const height = 196;
      const step = height / rows;
      const r = Math.min(10, step * 0.36);
      return (
        <g>
          <rect x={96} y={top - 6} width={48} height={height + 12} rx={5} fill={fill} stroke={edge} strokeWidth={2} />
          {Array.from({ length: rows }, (_, i) => (
            <g key={i}>
              <circle cx={120} cy={top + step * i + step / 2} r={r} fill="none" stroke={line} strokeWidth={1.2} />
              <circle cx={120} cy={top + step * i + step / 2} r={Math.max(1.4, r * 0.28)} fill={line} />
            </g>
          ))}
        </g>
      );
    }
    case 'ceiling':
      return (
        <g>
          <rect x={34} y={34} width={172} height={172} rx={9} fill={fill} stroke={edge} strokeWidth={2} />
          <circle cx={120} cy={120} r={66} fill="none" stroke={line} strokeWidth={1.4} />
          <g stroke={line} strokeWidth={0.8} opacity={0.55}>
            {Array.from({ length: 9 }, (_, i) => {
              const y = 66 + i * 13.5;
              const half = Math.sqrt(Math.max(0, 66 * 66 - (y - 120) * (y - 120)));
              return <line key={i} x1={120 - half} y1={y} x2={120 + half} y2={y} />;
            })}
          </g>
          <circle cx={120} cy={120} r={16} fill={fill} stroke={line} strokeWidth={1.4} />
          <circle cx={120} cy={120} r={5} fill={line} />
        </g>
      );
    case 'pendant':
      return (
        <g>
          <line x1={120} y1={14} x2={120} y2={78} stroke={edge} strokeWidth={1.6} />
          <rect x={113} y={70} width={14} height={9} rx={2} fill={fill} stroke={edge} strokeWidth={1.6} />
          <circle cx={120} cy={142} r={62} fill={fill} stroke={edge} strokeWidth={2} />
          <circle cx={120} cy={142} r={34} fill="none" stroke={line} strokeWidth={1.3} />
          <circle cx={120} cy={142} r={18} fill="none" stroke={line} strokeWidth={1.2} opacity={0.7} />
          <circle cx={120} cy={142} r={5} fill={line} />
        </g>
      );
    case 'horn':
      return (
        <g>
          <rect x={112} y={176} width={16} height={50} rx={3} fill="none" stroke={edge} strokeWidth={1.8} />
          <ellipse cx={120} cy={118} rx={84} ry={66} fill={fill} stroke={edge} strokeWidth={2} />
          <ellipse cx={120} cy={118} rx={62} ry={48} fill="none" stroke={line} strokeWidth={1.3} />
          <ellipse cx={120} cy={118} rx={38} ry={30} fill="none" stroke={line} strokeWidth={1.2} opacity={0.75} />
          <ellipse cx={120} cy={118} rx={14} ry={11} fill={line} />
        </g>
      );
    case 'rack': {
      return (
        <g>
          <rect x={12} y={92} width={216} height={56} rx={3} fill={fill} stroke={edge} strokeWidth={2} />
          {[22, 218].map((x) => [102, 138].map((y) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={3} fill="none" stroke={line} strokeWidth={1.2} />
          )))}
          <g stroke={line} strokeWidth={1.2} opacity={0.7}>
            {Array.from({ length: 9 }, (_, i) => <line key={i} x1={44 + i * 6} y1={104} x2={44 + i * 6} y2={136} />)}
          </g>
          <circle cx={150} cy={120} r={13} fill="none" stroke={line} strokeWidth={1.4} />
          <line x1={150} y1={120} x2={157} y2={111} stroke={line} strokeWidth={2} />
          <circle cx={186} cy={120} r={13} fill="none" stroke={line} strokeWidth={1.4} />
          <line x1={186} y1={120} x2={181} y2={110} stroke={line} strokeWidth={2} />
          <circle cx={206} cy={104} r={2.6} fill={AMBER} />
        </g>
      );
    }
    case 'processor':
      return (
        <g>
          <rect x={12} y={92} width={216} height={56} rx={3} fill={fill} stroke={edge} strokeWidth={2} />
          {[22, 218].map((x) => [102, 138].map((y) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={3} fill="none" stroke={line} strokeWidth={1.2} />
          )))}
          <rect x={42} y={102} width={72} height={36} rx={2} fill="#12151A" stroke={line} strokeWidth={1} />
          <polyline points="48,128 62,118 74,124 88,110 100,116 108,108" fill="none" stroke={AMBER} strokeWidth={1.6} />
          {[132, 150, 168, 186, 204].map((x) => (
            <rect key={x} x={x - 6} y={110} width={12} height={20} rx={1.5} fill="none" stroke={line} strokeWidth={1.2} />
          ))}
        </g>
      );
    case 'system':
      return (
        <g>
          {[46, 94, 142, 190].map((x) => (
            <g key={x}>
              <rect x={x - 17} y={34} width={34} height={40} rx={3} fill={fill} stroke={edge} strokeWidth={1.8} />
              <circle cx={x} cy={58} r={11} fill="none" stroke={line} strokeWidth={1.2} />
              <circle cx={x} cy={58} r={3} fill={line} />
              <circle cx={x} cy={42} r={3} fill="none" stroke={line} strokeWidth={1} />
            </g>
          ))}
          <g stroke={edge} strokeWidth={1.2} strokeDasharray="3 3" opacity={0.6} fill="none">
            <path d="M46 76 V108 H120" />
            <path d="M94 76 V108" />
            <path d="M142 76 V108" />
            <path d="M190 76 V108 H120" />
          </g>
          <rect x={20} y={112} width={200} height={34} rx={3} fill={fill} stroke={edge} strokeWidth={2} />
          <rect x={20} y={152} width={200} height={34} rx={3} fill={fill} stroke={edge} strokeWidth={2} />
          {[28, 212].map((x) => [123, 163].map((y) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={2.6} fill="none" stroke={line} strokeWidth={1.1} />
          )))}
          <circle cx={198} cy={123} r={2.6} fill={AMBER} />
          <rect x={44} y={118} width={60} height={22} rx={2} fill="none" stroke={line} strokeWidth={1} opacity={0.7} />
          <g stroke={line} strokeWidth={1.1} opacity={0.65}>
            {Array.from({ length: 12 }, (_, i) => <line key={i} x1={48 + i * 5} y1={160} x2={48 + i * 5} y2={178} />)}
          </g>
        </g>
      );
  }
}

export function ProductArt(props: ProductArtProps) {
  const { label, className } = props;
  return (
    <svg
      viewBox="0 0 240 240"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <Crosses />
      <Body props={props} />
    </svg>
  );
}
