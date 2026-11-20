// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Header } from '@/components/layout/Header';

async function renderHeader() {
  return render(await Header());
}

describe('Header (B2B: inquiry instead of a cart)', () => {
  it('has no cart button and no link to /cart or /checkout', async () => {
    const { container } = await renderHeader();
    expect(screen.queryByRole('button', { name: /cart/i })).toBeNull();
    for (const a of container.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href')!;
      expect(href.startsWith('/cart')).toBe(false);
      expect(href.startsWith('/checkout')).toBe(false);
    }
  });

  it('has an Inquire link to /inquiry, the mega-menu, the wordmark and the search box', async () => {
    await renderHeader();
    expect(screen.getByRole('link', { name: 'Inquire' })).toHaveAttribute('href', '/inquiry');
    expect(screen.getByRole('button', { name: 'Product type' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Judie's Audio home" })).toHaveAttribute('href', '/');
    expect(screen.getByRole('search', { name: 'Site search' })).toBeInTheDocument();
  });

  it('has no promo bar: the header is the first and only banner', async () => {
    const { container } = await renderHeader();
    expect(container.children).toHaveLength(1);
    expect(container.firstElementChild?.tagName).toBe('HEADER');
  });
});

describe('Header structure', () => {
  it('only the header ROW is sticky', async () => {
    const { container } = await renderHeader();
    const header = container.querySelector('header')!;
    expect(header.className).toContain('sticky');
    expect(header.className).toContain('top-0');
  });

  it('the sticky header is the first positioned ancestor of the mega-menu dropdown, so it spans the full width', async () => {
    const user = userEvent.setup();
    const { container } = await renderHeader();
    await user.click(screen.getByRole('button', { name: 'Product type' }));
    const panel = document.getElementById('menu-category') as HTMLElement;
    expect(panel.className).toContain('absolute');
    expect(panel.className).toContain('left-0');
    expect(panel.className).toContain('right-0');
    const positioned = /(^|\s)(relative|absolute|fixed|sticky)(\s|$)/;
    let el: HTMLElement | null = panel.parentElement;
    while (el && !positioned.test(el.className)) el = el.parentElement;
    expect(el).toBe(container.querySelector('header'));
  });
});

describe('Header search field', () => {
  it('has a readable placeholder, a visible border and a visible focus indicator on its wrapper', async () => {
    await renderHeader();
    const input = screen.getByRole('searchbox', { name: 'Search models' });
    expect(input.className).toContain('placeholder:text-ink-muted');
    const wrapper = input.parentElement as HTMLElement;
    expect(wrapper.className).toContain('border-ink-muted');
    expect(wrapper.className).not.toMatch(/(^|\s)border-line(\s|$)/);
    expect(wrapper.className).toContain('focus-within:outline-cobalt');
    expect(wrapper.className).not.toMatch(/rounded/);
  });

  it('never carries a bare outline-none (it would beat the :focus-visible base rule)', async () => {
    await renderHeader();
    const input = screen.getByRole('searchbox', { name: 'Search models' });
    expect(input.className.split(/\s+/)).not.toContain('outline-none');
  });
});
