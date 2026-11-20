import { FEATURED_IDS } from '@/lib/catalog/featured';
import type { PublicProduct } from '@/lib/catalog/public';
import type { Application, Category } from '@/lib/catalog/types';
import { CATEGORIES } from '@/lib/catalog/types';
import { facetValueLabel } from '@/lib/shop/facets';

/** The curated featured models, in authored order. Ids that are not in the catalogue are skipped. */
export function featuredProducts(products: readonly PublicProduct[]): PublicProduct[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return FEATURED_IDS.map((id) => byId.get(id)).filter((p): p is PublicProduct => p !== undefined);
}

// ---------------------------------------------------------------------------
// Model families. Each family is named in Filipino for what it does. The names
// are the catalogue's (lib/catalog/fixtures.ts); lib/home.test.ts checks that
// every family here matches a series and a category that really exist.
// ---------------------------------------------------------------------------

export type ChainStage = 'source' | 'processor' | 'amplifier' | 'speaker' | 'system';

export interface Family {
  series: string;
  /** What the Filipino word means. */
  meaning: string;
  category: Category;
  stage: ChainStage;
  /** One plain line on what the family is. */
  role: string;
}

export const FAMILIES: readonly Family[] = [
  { series: 'Himig', meaning: 'melody', category: 'full-range', stage: 'speaker', role: 'Full-range speakers for music and speech.' },
  { series: 'Dagundong', meaning: 'rumble', category: 'subwoofer', stage: 'speaker', role: 'Subwoofers for the low end.' },
  { series: 'Haligi', meaning: 'pillar', category: 'column-array', stage: 'speaker', role: 'Column arrays that keep speech clear in long rooms.' },
  { series: 'Langit', meaning: 'sky', category: 'ceiling', stage: 'speaker', role: 'Ceiling and pendant speakers.' },
  { series: 'Ulan', meaning: 'rain', category: 'outdoor', stage: 'speaker', role: 'Weatherproof speakers for outdoor areas.' },
  { series: 'Lakas', meaning: 'strength', category: 'amplification', stage: 'amplifier', role: 'Amplifiers and the DSP that tunes them.' },
  { series: 'Tipon', meaning: 'to gather', category: 'system', stage: 'system', role: 'Complete systems, specified together.' },
];

export interface ChainLink {
  stage: Exclude<ChainStage, 'system'>;
  label: string;
  note: string;
}

/** The signal chain, left to right. The source is the buyer's own: it is not in the catalogue. */
export const SIGNAL_CHAIN: readonly ChainLink[] = [
  { stage: 'source', label: 'Source', note: 'Your music player, a microphone or a feed. Not sold here.' },
  { stage: 'processor', label: 'Processor', note: 'DSP sets levels, EQ and delay per zone (Lakas).' },
  { stage: 'amplifier', label: 'Amplifier', note: 'Powers each channel or zone (Lakas).' },
  { stage: 'speaker', label: 'Speakers', note: 'Himig, Dagundong, Haligi, Langit and Ulan.' },
];

// ---------------------------------------------------------------------------
// Venue finder. Pure navigation: choose a venue, optionally a floor-area band,
// and get links into the filtered shop. It gives no acoustic advice and no
// sizing numbers: the catalogue decides what matches, and the floor area is only
// carried into the inquiry so the people reading it have it.
// ---------------------------------------------------------------------------

export const AREA_BANDS = [
  { value: 'under-50', label: 'Under 50 m²' },
  { value: '50-150', label: '50 – 150 m²' },
  { value: '150-400', label: '150 – 400 m²' },
  { value: 'over-400', label: 'Over 400 m²' },
] as const;

export type AreaBand = (typeof AREA_BANDS)[number]['value'];

export function areaLabel(value: string): string | null {
  return AREA_BANDS.find((b) => b.value === value)?.label ?? null;
}

/** The inquiry, carrying the venue (and area) so the form can prefill its note. */
export function inquiryHref(venue: string, area?: string): string {
  const query = new URLSearchParams({ venue });
  if (area) query.set('area', area);
  return `/inquiry?${query.toString()}`;
}

export interface VenueMatch {
  category: Category;
  label: string;
  count: number;
  href: string;
}

export interface VenueResult {
  venue: Application;
  venueLabel: string;
  total: number;
  /** Matching product types with how many models each has, in catalogue order. */
  categories: VenueMatch[];
  /** The whole venue's filtered shop page. */
  shopHref: string;
  /** The inquiry, carrying the venue (and area) so they prefill the message. */
  inquiryHref: string;
}

export function venueResult(
  products: readonly PublicProduct[],
  venue: Application,
  area?: AreaBand,
): VenueResult {
  const forVenue = products.filter((p) => p.applications.includes(venue));
  const categories: VenueMatch[] = [];
  for (const category of CATEGORIES) {
    const count = forVenue.filter((p) => p.category === category).length;
    if (count === 0) continue;
    categories.push({
      category,
      label: facetValueLabel('category', category) ?? category,
      count,
      href: `/shop?application=${venue}&category=${category}`,
    });
  }
  return {
    venue,
    venueLabel: facetValueLabel('application', venue) ?? venue,
    total: forVenue.length,
    categories,
    shopHref: `/shop/application/${venue}`,
    inquiryHref: inquiryHref(venue, area),
  };
}

/** The note an inquiry starts with when it arrives from the venue finder. Whitelisted values only. */
export function venueNote(venue: string | undefined, area: string | undefined): string {
  const venueLabel = venue ? facetValueLabel('application', venue) : null;
  const areaText = area ? areaLabel(area) : null;
  const parts: string[] = [];
  if (venueLabel) parts.push(`Venue: ${venueLabel}.`);
  if (areaText) parts.push(`Floor area: ${areaText}.`);
  return parts.join(' ');
}
