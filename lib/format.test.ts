import { describe, expect, it } from 'vitest';
import { formatPeso } from '@/lib/format';

describe('formatPeso', () => {
  it('formats whole pesos with a symbol and thousands separators', () => {
    expect(formatPeso(0)).toBe('₱0');
    expect(formatPeso(950)).toBe('₱950');
    expect(formatPeso(12345)).toBe('₱12,345');
    expect(formatPeso(1_340_000)).toBe('₱1,340,000');
  });
});
