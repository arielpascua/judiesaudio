import Link from 'next/link';
import { facetValueLabel } from '@/lib/shop/facets';
import { buildQuery, type ShopFilters } from '@/lib/shop/filters';

const KEYS = ['category', 'application', 'mounting', 'power', 'finish'] as const;

/** One removable chip per active filter. Each link drops ONLY its own filter and keeps the rest (including sort). */
export function ActiveFilters({ filters, basePath }: { filters: ShopFilters; basePath: string }) {
  const chips: { label: string; href: string; wrap?: boolean }[] = [];
  const without = (patch: Partial<ShopFilters>) => {
    const qs = buildQuery({ ...filters, ...patch });
    return qs ? `${basePath}?${qs}` : basePath;
  };
  for (const key of KEYS) {
    const value = filters[key];
    if (!value) continue;
    chips.push({ label: facetValueLabel(key, value) ?? value, href: without({ [key]: undefined }) });
  }
  // The query is free text (up to 80 characters, possibly one unbroken word): let it wrap.
  if (filters.q) chips.push({ label: `Search “${filters.q}”`, href: without({ q: undefined }), wrap: true });
  if (chips.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <li key={chip.href}>
          <Link
            href={chip.href}
            className={`inline-flex min-h-[44px] items-center gap-2 border border-ink bg-chalk-deep px-3 font-mono text-xs uppercase tracking-wider hover:bg-ink hover:text-chalk${chip.wrap ? ' max-w-full break-all' : ''}`}
            aria-label={`Remove filter ${chip.label}`}
          >
            {chip.label} <span aria-hidden>×</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
