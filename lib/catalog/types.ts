// The catalogue's vocabulary. A product is one model in one finish; the way it
// is bought (single, pair, carton) is the only variant, and that variant — the
// "pack" — is what carries a price.

export const CATEGORIES = [
  'full-range', 'subwoofer', 'column-array', 'ceiling', 'outdoor', 'amplification', 'system',
] as const;
export const APPLICATIONS = [
  'restaurant-bar', 'retail', 'hospitality', 'worship', 'corporate', 'education', 'venues', 'fitness',
] as const;
export const MOUNTINGS = ['wall', 'ceiling', 'pole', 'stand', 'rack', 'surface'] as const;
export const FINISH_FAMILIES = ['black', 'white', 'grey', 'natural'] as const;
export const POWER_CLASSES = ['compact', 'mid', 'high'] as const;
export const PACK_IDS = ['single', 'pair', 'pack-4', 'pack-10'] as const;
/** How the schematic drawing of a product is built. */
export const ART_KINDS = [
  'cabinet', 'subwoofer', 'column', 'ceiling', 'pendant', 'horn', 'rack', 'processor', 'system',
] as const;

export type Category = (typeof CATEGORIES)[number];
export type Application = (typeof APPLICATIONS)[number];
export type Mounting = (typeof MOUNTINGS)[number];
export type FinishFamily = (typeof FINISH_FAMILIES)[number];
export type PowerClass = (typeof POWER_CLASSES)[number];
export type PackId = (typeof PACK_IDS)[number];
export type ArtKind = (typeof ART_KINDS)[number];

export interface Finish {
  name: string;
  family: FinishFamily;
  hex: string;
}

/**
 * The numbers a datasheet is made of. The frequency-response curve on the
 * product page is DRAWN FROM THESE NUMBERS (lowHz / highHz), so they are never
 * decorative. `null` means "not applicable to this product", never "unknown".
 */
export interface Specs {
  /** Usable bandwidth, -10 dB points. null for products that make no sound (amplifiers, processors). */
  lowHz: number | null;
  highHz: number | null;
  /** Peak SPL at 1 m, dB. null where not applicable. */
  maxSplDb: number | null;
  /** Continuous (program) power handled or delivered, W (a system: total amplifier power). */
  powerW: number;
  /** Nominal impedance, ohms. null where the product is 70/100 V only or is not a loudspeaker. */
  impedanceOhm: number | null;
  /** Accepts a 70 V / 100 V constant-voltage line. */
  constantVoltage: boolean;
  /** Nominal coverage, horizontal × vertical degrees, e.g. "90° × 60°". null where not applicable. */
  coverage: string | null;
  /** Driver complement in words, e.g. "1 × 8″ woofer, 1 × 1″ HF driver". */
  drivers: string;
  /** Ingress protection, e.g. "IP55". null when not rated. */
  ip: string | null;
  weightKg: number;
  /** width × height × depth, millimetres. */
  dimensionsMm: [number, number, number];
  /** Used only to draw the schematic: how many woofers, and their size in inches (0 for none). */
  woofers: number;
  wooferIn: number;
}

export interface Pack {
  id: PackId;
  label: string;
  /** Units per pack. */
  units: number;
  /** Whole pesos for the WHOLE PACK. The ONLY price authority is this catalogue, server-side. */
  price: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  /** The family it belongs to (e.g. "Himig"). */
  series: string;
  category: Category;
  applications: Application[];
  mounting: Mounting;
  finish: Finish;
  art: ArtKind;
  specs: Specs;
  packs: Pack[];
  inStock: boolean;
  shortDescription: string;
  description: string[];
  /** Install and care notes. */
  install: string[];
}
