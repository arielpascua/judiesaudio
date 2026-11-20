// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '@/lib/catalog/fixtures';
import { toPublicProduct } from '@/lib/catalog/public';
import { ProductCard } from '@/components/shop/ProductCard';
import { ProductGrid } from '@/components/shop/ProductGrid';
import { headlineSpec } from '@/lib/shop/spec-format';

const byId = (id: string) => toPublicProduct(PRODUCTS.find((p) => p.id === id)!);

describe('ProductCard', () => {
  const product = byId('ja-fr-02'); // Himig 8

  it('links to the model datasheet, names the model, series and category, and shows no price', () => {
    const { container } = render(<ProductCard product={product} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/models/himig-8');
    expect(screen.getByRole('heading', { name: 'Himig 8' })).toBeInTheDocument();
    expect(screen.getByText('Himig')).toBeInTheDocument();
    expect(screen.getByText('Full-range speakers')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/₱|From|price|buy|cart/i);
  });

  it('shows a mono headline spec built from the specification', () => {
    render(<ProductCard product={product} />);
    expect(headlineSpec(product)).toBe('55 Hz – 20 kHz · 250 W');
    expect(screen.getByText('55 Hz – 20 kHz · 250 W')).toBeInTheDocument();
  });

  it('draws the schematic on a faceplate and keeps it decorative (the name is printed beside it)', () => {
    const { container } = render(<ProductCard product={product} />);
    expect(container.querySelector('.faceplate svg')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('img')).toBeNull();
  });

  it('shows no rating, review count, sale badge or struck-through price', () => {
    const { container } = render(<ProductCard product={product} />);
    expect(container.querySelector('s, del')).toBeNull();
    expect(container).not.toHaveTextContent(/★|reviews?|% off|sale/i);
  });

  it('uses squared corners only (no pills)', () => {
    const { container } = render(<ProductCard product={product} />);
    expect(container.innerHTML).not.toMatch(/rounded/);
  });
});

describe('headlineSpec', () => {
  it('omits what does not exist: an amplifier has power but no bandwidth', () => {
    expect(headlineSpec(byId('ja-am-01'))).toBe('600 W');
  });

  it('falls back to a plain label for a processor with neither', () => {
    expect(headlineSpec(byId('ja-am-03'))).toBe('Signal processing');
  });

  it('formats kHz without a stray decimal', () => {
    expect(headlineSpec(byId('ja-ou-02'))).toBe('120 Hz – 16 kHz · 150 W');
  });
});

describe('ProductGrid', () => {
  it('renders one card per product, in the order given', () => {
    const products = [byId('ja-sw-01'), byId('ja-ce-01')];
    render(<ProductGrid products={products} />);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/models/dagundong-12s', '/models/langit-6c']);
  });
});
