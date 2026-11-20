import { describe, expect, it } from 'vitest';
import { normalizePhone } from '@/lib/phone';

describe('normalizePhone', () => {
  it('keeps digits and a leading plus, dropping separators', () => {
    expect(normalizePhone('+63 917 000 0000')).toBe('+639170000000');
    expect(normalizePhone('(02) 8123-4567')).toBe('0281234567');
    expect(normalizePhone('  0917.000.0000 ')).toBe('09170000000');
  });

  it('rejects letters, other symbols, a mid-string plus and a non-number', () => {
    for (const bad of ['call me', '0917abc0000', '09170000000; drop', '0917+0000000', '<script>', '']) {
      expect(normalizePhone(bad)).toBeNull();
    }
  });

  it('rejects numbers too short or too long to dial', () => {
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('1'.repeat(16))).toBeNull();
    expect(normalizePhone('1'.repeat(15))).toBe('1'.repeat(15));
  });
});
