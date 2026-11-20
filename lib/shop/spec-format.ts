import type { PublicProduct } from '@/lib/catalog/public';
import { facetValueLabel } from './facets';

/** 55 -> "55 Hz", 20000 -> "20 kHz", 16500 -> "16.5 kHz". */
export function formatHz(hz: number): string {
  return hz >= 1000 ? `${Number((hz / 1000).toFixed(1))} kHz` : `${hz} Hz`;
}

const NOT_APPLICABLE = 'Not applicable';

/** The one-line readout on a product card: bandwidth and power, only where they exist. */
export function headlineSpec(product: Pick<PublicProduct, 'specs'>): string {
  const { lowHz, highHz, powerW } = product.specs;
  const parts: string[] = [];
  if (lowHz !== null && highHz !== null) parts.push(`${formatHz(lowHz)} – ${formatHz(highHz)}`);
  if (powerW > 0) parts.push(`${powerW} W`);
  return parts.length > 0 ? parts.join(' · ') : 'Signal processing';
}

export interface SpecRow {
  label: string;
  value: string;
}

/** The datasheet's specification table, in reading order. Every value comes from the catalogue. */
export function specRows(product: PublicProduct): SpecRow[] {
  const s = product.specs;
  const [w, h, d] = s.dimensionsMm;
  const impedance =
    s.impedanceOhm !== null ? `${s.impedanceOhm} Ω` : s.constantVoltage ? '70 V / 100 V line only' : NOT_APPLICABLE;
  return [
    { label: 'Bandwidth (−10 dB)', value: s.lowHz !== null && s.highHz !== null ? `${formatHz(s.lowHz)} – ${formatHz(s.highHz)}` : NOT_APPLICABLE },
    { label: 'Max SPL at 1 m', value: s.maxSplDb !== null ? `${s.maxSplDb} dB` : NOT_APPLICABLE },
    { label: 'Power (continuous)', value: s.powerW > 0 ? `${s.powerW} W` : NOT_APPLICABLE },
    { label: 'Impedance', value: impedance },
    { label: 'Constant voltage (70/100 V)', value: s.constantVoltage ? 'Yes' : 'No' },
    { label: 'Coverage (H × V)', value: s.coverage ?? NOT_APPLICABLE },
    { label: 'Drivers', value: s.drivers },
    { label: 'Ingress protection', value: s.ip ?? 'Not rated' },
    { label: 'Weight', value: `${s.weightKg} kg` },
    { label: 'Dimensions (W × H × D)', value: `${w} × ${h} × ${d} mm` },
    { label: 'Mounting', value: facetValueLabel('mounting', product.mounting) ?? product.mounting },
    { label: 'Finish', value: product.finish.name },
  ];
}
