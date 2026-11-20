import { powerClass } from '@/lib/catalog/packs';
import type { PublicProduct } from '@/lib/catalog/public';
import type { Application, Category, FinishFamily, Mounting, PowerClass } from '@/lib/catalog/types';
import { APPLICATIONS, CATEGORIES, FINISH_FAMILIES, MOUNTINGS, POWER_CLASSES } from '@/lib/catalog/types';

// Public pages show no prices, so there is no price sort. Stale `sort=price-asc`
// values in old shared links fall back to 'featured' (parseFilters never throws).
export type SortKey = 'featured' | 'name';
const SORT_KEYS: readonly SortKey[] = ['featured', 'name'];

export interface ShopFilters {
  category?: Category;
  application?: Application;
  mounting?: Mounting;
  power?: PowerClass;
  finish?: FinishFamily;
  q?: string;
  sort: SortKey;
}

const FILTER_KEYS = ['category', 'application', 'mounting', 'power', 'finish'] as const;

type RawInput = Record<string, string | string[] | undefined>;

const MAX_QUERY = 80;

function first(input: RawInput, key: string): string | undefined {
  const raw = input[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' ? value : undefined;
}

function oneOf<T extends string>(allowed: readonly T[], raw: string | undefined): T | undefined {
  return raw !== undefined && (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined;
}

/**
 * Query string in, validated filters out. NEVER throws: anything that is not a
 * known value is dropped, because a shared URL must always render.
 */
export function parseFilters(input: RawInput): ShopFilters {
  const filters: ShopFilters = { sort: oneOf(SORT_KEYS, first(input, 'sort')) ?? 'featured' };

  const category = oneOf(CATEGORIES, first(input, 'category'));
  const application = oneOf(APPLICATIONS, first(input, 'application'));
  const mounting = oneOf(MOUNTINGS, first(input, 'mounting'));
  const power = oneOf(POWER_CLASSES, first(input, 'power'));
  const finish = oneOf(FINISH_FAMILIES, first(input, 'finish'));
  if (category) filters.category = category;
  if (application) filters.application = application;
  if (mounting) filters.mounting = mounting;
  if (power) filters.power = power;
  if (finish) filters.finish = finish;

  const q = first(input, 'q')?.slice(0, MAX_QUERY).trim();
  if (q) filters.q = q;

  return filters;
}

/** How many filters are narrowing the list: facet values and search text. Sort is not a filter. */
export function countActiveFilters(f: ShopFilters): number {
  let n = 0;
  for (const key of FILTER_KEYS) if (f[key]) n++;
  if (f.q) n++;
  return n;
}

export function applyFilters(products: readonly PublicProduct[], f: ShopFilters): PublicProduct[] {
  const tokens = f.q ? f.q.toLowerCase().split(/\s+/).filter(Boolean) : [];
  return products.filter((p) => {
    if (f.category && p.category !== f.category) return false;
    if (f.application && !p.applications.includes(f.application)) return false;
    if (f.mounting && p.mounting !== f.mounting) return false;
    if (f.power && powerClass(p) !== f.power) return false;
    if (f.finish && p.finish.family !== f.finish) return false;
    if (tokens.length > 0) {
      const hay = [p.name, p.series, p.category, p.mounting, p.finish.name, p.shortDescription, p.specs.drivers]
        .join(' ')
        .toLowerCase();
      if (!tokens.every((t) => hay.includes(t))) return false;
    }
    return true;
  });
}

export function sortProducts(products: readonly PublicProduct[], sort: SortKey): PublicProduct[] {
  const copy = [...products];
  if (sort === 'name') return copy.sort((a, b) => a.name.localeCompare(b.name));
  return copy;
}

/** Query string without the leading `?`, omitting defaults. */
export function buildQuery(f: ShopFilters): string {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const v = f[key];
    if (v) params.set(key, v);
  }
  if (f.q) params.set('q', f.q);
  if (f.sort !== 'featured') params.set('sort', f.sort);
  return params.toString();
}
