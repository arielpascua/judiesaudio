'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronIcon } from '@/components/layout/icons';
import { FACETS } from '@/lib/shop/facets';
import { buildQuery, countActiveFilters, type ShopFilters, type SortKey } from '@/lib/shop/filters';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'name', label: 'Name' },
];

const selectClass = 'field';

/** Matches Tailwind's `lg`: the breakpoint where the panel sits beside the grid and is always open. */
const DESKTOP = '(min-width: 1024px)';

/**
 * A plain GET form: works without JavaScript, and every state is a shareable URL.
 *
 * CLOSED by default so a phone shows the models first (open, the form is ~850px
 * tall). A small effect opens it at desktop width and follows the breakpoint.
 *
 * The <form> is keyed on the current filters. Its fields use defaultValue, which
 * React only applies on mount: without the key, removing a chip or clearing
 * filters (a soft navigation that re-renders this component with new props)
 * left the old selections in the selects, and the next Apply silently put the
 * removed filters back.
 */
export function FilterPanel({ filters, action }: { filters: ShopFilters; action: string }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const active = countActiveFilters(filters);
  // At desktop width the summary is not a control, so it must not be a Tab stop either.
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(DESKTOP);
    setDesktop(query.matches);
    if (query.matches && detailsRef.current) detailsRef.current.open = true;
    const onChange = (event: MediaQueryListEvent) => {
      setDesktop(event.matches);
      if (detailsRef.current) detailsRef.current.open = event.matches;
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return (
    <details ref={detailsRef} className="group border border-ink bg-white">
      <summary
        tabIndex={desktop ? -1 : undefined}
        aria-hidden={desktop ? true : undefined}
        className="flex min-h-[44px] cursor-pointer list-none items-center justify-between px-4 font-mono text-[12px] font-medium uppercase tracking-[0.1em] lg:cursor-default [&::-webkit-details-marker]:hidden"
        onClick={(event) => {
          // At desktop width the panel is a fixture, not a disclosure.
          if (typeof window.matchMedia === 'function' && window.matchMedia(DESKTOP).matches) event.preventDefault();
        }}
      >
        <span>Filter &amp; sort{active > 0 ? ` (${active})` : ''}</span>
        <ChevronIcon className="transition-transform group-open:rotate-180 lg:hidden" />
      </summary>
      <form key={buildQuery(filters)} method="get" action={action} className="space-y-4 px-4 pb-5">
        {filters.q ? <input type="hidden" name="q" defaultValue={filters.q} /> : null}
        {FACETS.map((facet) => (
          <div key={facet.key}>
            <label htmlFor={`f-${facet.key}`} className="eyebrow">
              {facet.label}
            </label>
            <select id={`f-${facet.key}`} name={facet.key} defaultValue={filters[facet.key] ?? ''} className={selectClass}>
              <option value="">Any</option>
              {facet.values.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        ))}
        <div>
          <label htmlFor="f-sort" className="eyebrow">Sort by</label>
          <select id="f-sort" name="sort" defaultValue={filters.sort} className={selectClass}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary w-full">Apply</button>
      </form>
    </details>
  );
}
