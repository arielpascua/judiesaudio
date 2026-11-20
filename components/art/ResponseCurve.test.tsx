// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResponseCurve } from '@/components/art/ResponseCurve';
import { PLOT, responseDb, tracePath, xOf, yOf } from '@/components/art/response-math';
import { PRODUCTS } from '@/lib/catalog/fixtures';

describe('responseDb: the curve is built from the datasheet numbers', () => {
  it('is -10 dB at lowHz and highHz for a wide-band model', () => {
    expect(responseDb(55, 55, 20000)).toBeCloseTo(-10, 1);
    expect(responseDb(20000, 55, 20000)).toBeCloseTo(-10, 1);
  });

  it('stays within half a dB of -10 at both points even for a narrow-band subwoofer', () => {
    expect(Math.abs(responseDb(38, 38, 150) + 10)).toBeLessThan(0.5);
    expect(Math.abs(responseDb(150, 38, 150) + 10)).toBeLessThan(0.5);
  });

  it('is flat in the middle of the band and rolls off steeply outside it', () => {
    expect(responseDb(1000, 55, 20000)).toBeGreaterThan(-0.1);
    expect(responseDb(20, 55, 20000)).toBeLessThan(responseDb(40, 55, 20000));
    expect(responseDb(20, 55, 20000)).toBeLessThan(-20);
    expect(responseDb(100, 38, 150)).toBeLessThan(0);
  });

  it('moves with the numbers: a different lowHz gives a different curve', () => {
    expect(responseDb(60, 45, 20000)).toBeGreaterThan(responseDb(60, 100, 20000));
  });
});

describe('plot geometry', () => {
  it('maps 20 Hz and 20 kHz to the plot edges and log-spaces the decades', () => {
    expect(xOf(20)).toBeCloseTo(PLOT.left, 5);
    expect(xOf(20000)).toBeCloseTo(PLOT.width - PLOT.right, 5);
    expect(xOf(1000) - xOf(100)).toBeCloseTo(xOf(100) - xOf(10), 3);
  });

  it('puts 0 dB above -10 dB, and the trace path has a length for the draw-on animation', () => {
    expect(yOf(0)).toBeLessThan(yOf(-10));
    const trace = tracePath(55, 20000);
    expect(trace.d.startsWith('M')).toBe(true);
    expect(trace.length).toBeGreaterThan(300);
  });
});

describe('<ResponseCurve>', () => {
  const himig8 = PRODUCTS.find((p) => p.id === 'ja-fr-02')!;

  it('draws a labelled graph with the 20, 100, 1k, 10k and 20k ticks and a drawn trace', () => {
    const { container } = render(<ResponseCurve lowHz={himig8.specs.lowHz} highHz={himig8.specs.highHz} name={himig8.name} />);
    const svg = screen.getByRole('img', { name: /Nominal frequency response of Himig 8/ });
    for (const tick of ['20', '100', '1k', '10k', '20k']) expect(within(svg as unknown as HTMLElement).getAllByText(tick).length).toBeGreaterThan(0);
    expect(container.querySelector('path.trace-draw')).not.toBeNull();
    expect(container.textContent).toContain('−10 dB at 55 Hz and 20 kHz');
  });

  it('draws the trace from the numbers: a different product gives a different path', () => {
    const a = render(<ResponseCurve lowHz={55} highHz={20000} name="A" />);
    const pathA = a.container.querySelector('path.trace-draw')!.getAttribute('d');
    a.unmount();
    const b = render(<ResponseCurve lowHz={120} highHz={16000} name="B" />);
    expect(b.container.querySelector('path.trace-draw')!.getAttribute('d')).not.toBe(pathA);
  });

  it('has a text alternative: a table of nominal levels, and says the curve is idealised', () => {
    render(<ResponseCurve lowHz={55} highHz={20000} name="Himig 8" />);
    const table = screen.getByRole('table', { name: /Nominal level of Himig 8/ });
    expect(within(table).getAllByRole('row').length).toBeGreaterThan(5);
    expect(screen.getByText(/Idealised from the two −10 dB points/)).toBeInTheDocument();
  });

  it('shows an honest "not applicable" state, and no curve, for a product that makes no sound', () => {
    const amp = PRODUCTS.find((p) => p.id === 'ja-am-01')!;
    const { container } = render(<ResponseCurve lowHz={amp.specs.lowHz} highHz={amp.specs.highHz} name={amp.name} />);
    expect(screen.getByRole('note')).toHaveTextContent('Not applicable: this product does not produce sound.');
    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('path')).toBeNull();
  });

  it('every catalogue product either gets a curve or the empty state, matching its null specs', () => {
    for (const p of PRODUCTS) {
      const { container, unmount } = render(<ResponseCurve lowHz={p.specs.lowHz} highHz={p.specs.highHz} name={p.name} />);
      const hasCurve = container.querySelector('path.trace-draw') !== null;
      expect(hasCurve, p.id).toBe(p.specs.lowHz !== null && p.specs.highHz !== null);
      unmount();
    }
  });
});
