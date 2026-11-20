type IconProps = { className?: string };
const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

export const SearchIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const MenuIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const CloseIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}><path d="m6 6 12 12M18 6 6 18" /></svg>
);
export const ChevronIcon = ({ className }: IconProps) => (
  <svg {...base} width={16} height={16} className={className}><path d="m6 9 6 6 6-6" /></svg>
);
