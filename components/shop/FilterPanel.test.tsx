// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActiveFilters } from '@/components/shop/ActiveFilters';
import { FilterPanel } from '@/components/shop/FilterPanel';
import { parseFilters } from '@/lib/shop/filters';

type Listener = (e: MediaQueryListEvent) => void;

/** A controllable matchMedia: `set(true)` fires the registered change listeners. */
function stubMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<Listener>();
  window.matchMedia = vi.fn((query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    addEventListener: (_: string, fn: Listener) => listeners.add(fn),
    removeEventListener: (_: string, fn: Listener) => listeners.delete(fn),
  })) as unknown as typeof window.matchMedia;
  return {
    set(next: boolean) {
      matches = next;
      act(() => listeners.forEach((fn) => fn({ matches: next } as MediaQueryListEvent)));
    },
    listenerCount: () => listeners.size,
  };
}

afterEach(() => {
  // @ts-expect-error removing the stub so the next test starts without matchMedia (jsdom has none)
  delete window.matchMedia;
});

describe('FilterPanel', () => {
  it('is a plain GET form that preselects the current filters and keeps the search text', () => {
    const filters = parseFilters({ category: 'full-range', mounting: 'wall', q: 'wool', sort: 'name' });
    const { container } = render(<FilterPanel filters={filters} action="/shop" />);
    const form = container.querySelector('form')!;
    expect(form).toHaveAttribute('method', 'get');
    expect(form).toHaveAttribute('action', '/shop');
    expect(screen.getByLabelText('Product type')).toHaveValue('full-range');
    expect(screen.getByLabelText('Mounting')).toHaveValue('wall');
    expect(screen.getByLabelText('Sort by')).toHaveValue('name');
    expect(container.querySelector('input[name="q"]')).toHaveValue('wool');
  });

  it('C1: the selects follow the filters after a soft navigation (no stale selections to re-apply)', () => {
    const { rerender } = render(
      <FilterPanel filters={parseFilters({ category: 'full-range', mounting: 'wall', application: 'retail' })} action="/shop" />,
    );
    expect(screen.getByLabelText('Product type')).toHaveValue('full-range');
    expect(screen.getByLabelText('Venue')).toHaveValue('retail');

    // chip removal: the product-type filter goes away
    rerender(<FilterPanel filters={parseFilters({ mounting: 'wall', application: 'retail' })} action="/shop" />);
    expect(screen.getByLabelText('Product type')).toHaveValue('');
    expect(screen.getByLabelText('Mounting')).toHaveValue('wall');

    // "Clear filters": everything goes away
    rerender(<FilterPanel filters={parseFilters({})} action="/shop" />);
    expect(screen.getByLabelText('Mounting')).toHaveValue('');
    expect(screen.getByLabelText('Sort by')).toHaveValue('featured');
  });

  it('C1: a selection the customer changed but did not apply is dropped when the filters change', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<FilterPanel filters={parseFilters({ category: 'full-range' })} action="/shop" />);
    await user.selectOptions(screen.getByLabelText('Venue'), 'retail');
    rerender(<FilterPanel filters={parseFilters({})} action="/shop" />);
    expect(screen.getByLabelText('Venue')).toHaveValue('');
  });

  describe('C2: collapsed on mobile, open on desktop', () => {
    const details = () => document.querySelector('details') as HTMLDetailsElement;

    it('is CLOSED by default when the viewport is below the lg breakpoint', () => {
      stubMatchMedia(false);
      render(<FilterPanel filters={parseFilters({})} action="/shop" />);
      expect(details().open).toBe(false);
    });

    it('is closed with no matchMedia at all (SSR-like / old browser)', () => {
      render(<FilterPanel filters={parseFilters({})} action="/shop" />);
      expect(details().open).toBe(false);
    });

    it('opens at desktop width and follows the breakpoint on resize', () => {
      const media = stubMatchMedia(true);
      render(<FilterPanel filters={parseFilters({})} action="/shop" />);
      expect(details().open).toBe(true);
      media.set(false);
      expect(details().open).toBe(false);
      media.set(true);
      expect(details().open).toBe(true);
    });

    it('removes its media listener on unmount', () => {
      const media = stubMatchMedia(false);
      const { unmount } = render(<FilterPanel filters={parseFilters({})} action="/shop" />);
      expect(media.listenerCount()).toBe(1);
      unmount();
      expect(media.listenerCount()).toBe(0);
    });

    it('lets the summary toggle the panel on mobile but not at desktop width', async () => {
      const user = userEvent.setup();
      const media = stubMatchMedia(false);
      render(<FilterPanel filters={parseFilters({})} action="/shop" />);
      await user.click(screen.getByText(/Filter & sort/));
      expect(details().open).toBe(true);
      await user.click(screen.getByText(/Filter & sort/));
      expect(details().open).toBe(false);
      media.set(true);
      expect(details().open).toBe(true);
      await user.click(screen.getByText(/Filter & sort/));
      expect(details().open).toBe(true); // a fixture at desktop width
    });

    it('shows the number of active filters in the summary, and nothing when there are none', () => {
      const { rerender } = render(<FilterPanel filters={parseFilters({})} action="/shop" />);
      expect(screen.getByText('Filter & sort')).toBeInTheDocument();
      rerender(<FilterPanel filters={parseFilters({ category: 'full-range', mounting: 'wall', sort: 'name' })} action="/shop" />);
      expect(screen.getByText('Filter & sort (2)')).toBeInTheDocument();
      rerender(<FilterPanel filters={parseFilters({ q: 'wool', category: 'full-range', mounting: 'wall' })} action="/shop" />);
      expect(screen.getByText('Filter & sort (3)')).toBeInTheDocument();
    });

    it('at desktop width the summary is not a focus stop (tabindex -1, aria-hidden); below it, it is restored', () => {
      const media = stubMatchMedia(true);
      render(<FilterPanel filters={parseFilters({})} action="/shop" />);
      const summary = document.querySelector('summary')!;
      expect(summary).toHaveAttribute('tabindex', '-1');
      expect(summary).toHaveAttribute('aria-hidden', 'true');
      media.set(false);
      expect(summary).not.toHaveAttribute('tabindex');
      expect(summary).not.toHaveAttribute('aria-hidden');
      media.set(true);
      expect(summary).toHaveAttribute('tabindex', '-1');
    });

    it('on a phone the summary stays a normal focus stop', () => {
      stubMatchMedia(false);
      render(<FilterPanel filters={parseFilters({})} action="/shop" />);
      const summary = document.querySelector('summary')!;
      expect(summary).not.toHaveAttribute('tabindex');
      expect(summary).not.toHaveAttribute('aria-hidden');
    });

    it('draws a chevron in the summary (decorative, hidden from assistive tech)', () => {
      render(<FilterPanel filters={parseFilters({})} action="/shop" />);
      const svg = document.querySelector('summary svg')!;
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });
});

describe('FilterPanel has no price controls (R-B2B-1)', () => {
  it('has no min/max price inputs and no peso sign, and sorts only by Featured or Name', () => {
    const { container } = render(<FilterPanel filters={parseFilters({})} action="/shop" />);
    expect(container.querySelector('input[name="minPrice"], input[name="maxPrice"], input[type="number"]')).toBeNull();
    expect(container.textContent).not.toMatch(/₱|price/i);
    const options = Array.from(screen.getByLabelText('Sort by').querySelectorAll('option')).map((o) => o.textContent);
    expect(options).toEqual(['Featured', 'Name']);
  });
});

describe('ActiveFilters', () => {
  it('renders one removable chip per active filter, each link dropping only that filter', () => {
    const filters = parseFilters({ category: 'full-range', mounting: 'wall' });
    render(<ActiveFilters filters={filters} basePath="/shop" />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links.map((l) => l.getAttribute('href')).sort()).toEqual(['/shop?category=full-range', '/shop?mounting=wall']);
  });

  it('C2: has a chip for the search text, and removal keeps every other filter', () => {
    const filters = parseFilters({ category: 'full-range', q: 'wool', sort: 'name' });
    render(<ActiveFilters filters={filters} basePath="/shop" />);
    const q = screen.getByRole('link', { name: 'Remove filter Search “wool”' });
    const params = (el: HTMLElement) => new URLSearchParams(el.getAttribute('href')!.split('?')[1]);
    expect(Object.fromEntries(params(q))).toEqual({ category: 'full-range', sort: 'name' });
  });

  it('shows no price chip for stale minPrice/maxPrice params from an old shared link', () => {
    const filters = parseFilters({ category: 'full-range', minPrice: '1000', maxPrice: '9000', sort: 'price-asc' });
    const { container } = render(<ActiveFilters filters={filters} basePath="/shop" />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(container.textContent).not.toMatch(/₱|Min|Max/);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/shop');
  });

  it('the search chip can wrap an 80-character unbroken query instead of overflowing at 360px', () => {
    render(<ActiveFilters filters={parseFilters({ q: 'x'.repeat(80) })} basePath="/shop" />);
    const link = screen.getByRole('link');
    expect(link.className).toContain('break-all');
    expect(link.className).toContain('max-w-full');
  });

  it('removing the last filter links to the bare path', () => {
    render(<ActiveFilters filters={parseFilters({ q: 'wool' })} basePath="/shop" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/shop');
  });

  it('C7: every chip is at least 44px tall', () => {
    render(<ActiveFilters filters={parseFilters({ category: 'full-range', q: 'a' })} basePath="/shop" />);
    for (const link of screen.getAllByRole('link')) expect(link.className).toContain('min-h-[44px]');
  });

  it('renders nothing when no filter is active', () => {
    const { container } = render(<ActiveFilters filters={parseFilters({})} basePath="/shop" />);
    expect(container).toBeEmptyDOMElement();
  });
});
