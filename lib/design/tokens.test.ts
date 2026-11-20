import { describe, expect, it } from 'vitest';
import { COLOURS, NON_TEXT_PAIRS, TEXT_PAIRS, contrastRatio } from '@/lib/design/tokens';

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for identical colours', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#336699', '#336699')).toBeCloseTo(1, 5);
  });
});

describe('colour tokens meet WCAG AA for text (R-SF-7)', () => {
  it.each(TEXT_PAIRS)('$name is at least 4.5:1', ({ fg, bg }) => {
    expect(contrastRatio(COLOURS[fg], COLOURS[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it('covers muted ink on white (the search field placeholder)', () => {
    expect(TEXT_PAIRS).toContainEqual(expect.objectContaining({ fg: 'inkMuted', bg: 'white' }));
  });
});

describe('colour tokens meet WCAG 1.4.11 for UI component boundaries (R-SF-7)', () => {
  it.each(NON_TEXT_PAIRS)('$name is at least 3:1', ({ fg, bg }) => {
    expect(contrastRatio(COLOURS[fg], COLOURS[bg])).toBeGreaterThanOrEqual(3);
  });

  it('covers the search field border on white', () => {
    expect(NON_TEXT_PAIRS).toContainEqual(expect.objectContaining({ fg: 'inkMuted', bg: 'white' }));
  });

  it('the decorative hairline token is NOT used for a field boundary', () => {
    // line on white is intentionally low contrast; this documents why fields use inkMuted.
    expect(contrastRatio(COLOURS.line, COLOURS.white)).toBeLessThan(3);
  });
});
