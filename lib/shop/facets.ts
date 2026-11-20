// The vocabulary the mega-menu, the filter panel and the landing pages share.

export type FacetKey = 'category' | 'application' | 'mounting' | 'power' | 'finish';

export interface FacetValue {
  value: string;
  label: string;
}

export interface FacetDef {
  key: FacetKey;
  label: string;
  values: FacetValue[];
}

export const FACETS: readonly FacetDef[] = [
  {
    key: 'category',
    label: 'Product type',
    values: [
      { value: 'full-range', label: 'Full-range speakers' },
      { value: 'subwoofer', label: 'Subwoofers' },
      { value: 'column-array', label: 'Column arrays' },
      { value: 'ceiling', label: 'Ceiling speakers' },
      { value: 'outdoor', label: 'Weatherproof speakers' },
      { value: 'amplification', label: 'Amplifiers & DSP' },
      { value: 'system', label: 'Complete systems' },
    ],
  },
  {
    key: 'application',
    label: 'Venue',
    values: [
      { value: 'restaurant-bar', label: 'Restaurants & bars' },
      { value: 'retail', label: 'Retail & showrooms' },
      { value: 'hospitality', label: 'Hotels & resorts' },
      { value: 'worship', label: 'Houses of worship' },
      { value: 'corporate', label: 'Offices & meeting rooms' },
      { value: 'education', label: 'Schools & campuses' },
      { value: 'venues', label: 'Halls & event venues' },
      { value: 'fitness', label: 'Gyms & studios' },
    ],
  },
  {
    key: 'mounting',
    label: 'Mounting',
    values: [
      { value: 'wall', label: 'Wall' },
      { value: 'ceiling', label: 'Ceiling' },
      { value: 'pole', label: 'Pole & bracket' },
      { value: 'stand', label: 'Stand & pole socket' },
      { value: 'surface', label: 'Floor & surface' },
      { value: 'rack', label: 'Rack' },
    ],
  },
  {
    key: 'power',
    label: 'Power',
    values: [
      { value: 'compact', label: 'Up to 150 W' },
      { value: 'mid', label: '151 – 600 W' },
      { value: 'high', label: 'Over 600 W' },
    ],
  },
  {
    key: 'finish',
    label: 'Finish',
    values: [
      { value: 'black', label: 'Black' },
      { value: 'white', label: 'White' },
      { value: 'grey', label: 'Weathered grey' },
    ],
  },
];

export function facetDef(key: string): FacetDef | null {
  return FACETS.find((f) => f.key === key) ?? null;
}

export function facetValueLabel(key: string, value: string): string | null {
  return facetDef(key)?.values.find((v) => v.value === value)?.label ?? null;
}
