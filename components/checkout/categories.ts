import type { Category } from '@/lib/catalog/types';

// Typed as Record<Category, string>: adding a category to the catalogue fails
// the type check here until it has a heading in the checkout picker.
export const CATEGORY_LABELS: Record<Category, string> = {
  'full-range': 'Full-range speakers',
  subwoofer: 'Subwoofers',
  'column-array': 'Column arrays',
  ceiling: 'Ceiling and pendant speakers',
  outdoor: 'Outdoor speakers',
  amplification: 'Amplification and processing',
  system: 'Complete systems',
};
