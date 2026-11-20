import type { PackId, PowerClass, Product } from './types';

export interface PackPreset {
  id: PackId;
  label: string;
  units: number;
  /** Trade discount against buying the same units one by one, in percent. */
  discountPct: number;
}

export const PACK_PRESETS: Record<PackId, PackPreset> = {
  single: { id: 'single', label: 'Single unit', units: 1, discountPct: 0 },
  pair: { id: 'pair', label: 'Matched pair', units: 2, discountPct: 3 },
  'pack-4': { id: 'pack-4', label: 'Pack of 4', units: 4, discountPct: 6 },
  'pack-10': { id: 'pack-10', label: 'Carton of 10', units: 10, discountPct: 10 },
};

/** Whole pesos for a whole pack: unit price × units, less the pack discount, rounded to the nearest ₱50. */
export function packPrice(packId: PackId, unitPrice: number): number {
  const { units, discountPct } = PACK_PRESETS[packId];
  return Math.round((unitPrice * units * (100 - discountPct)) / 100 / 50) * 50;
}

/** Continuous power bands used by the "Power" filter. */
export function powerClass(product: Pick<Product, 'specs'>): PowerClass {
  const w = product.specs.powerW;
  if (w <= 150) return 'compact';
  if (w <= 600) return 'mid';
  return 'high';
}
