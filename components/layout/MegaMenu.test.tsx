// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MegaMenu } from '@/components/layout/MegaMenu';
import { FACETS } from '@/lib/shop/facets';

const menu = () => <MegaMenu facets={FACETS} />;

describe('MegaMenu', () => {
  it('offers Product type, Venue and Mounting as buttons, all collapsed', () => {
    render(menu());
    for (const label of ['Product type', 'Venue', 'Mounting']) {
      expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-expanded', 'false');
    }
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('leaves power and finish to the shop filter, not the menu', () => {
    render(menu());
    expect(screen.queryByRole('button', { name: /power|finish/i })).not.toBeInTheDocument();
  });

  it('offers an "All products" link to /shop as tall as the buttons, after them', () => {
    render(menu());
    const link = screen.getByRole('link', { name: 'All products' });
    expect(link).toHaveAttribute('href', '/shop');
    expect(link.className).toContain('min-h-[44px]');
    const buttons = screen.getAllByRole('button');
    expect(buttons[buttons.length - 1].compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows only the facets it is given (a menu never offers a value with no models)', async () => {
    const user = userEvent.setup();
    const partial = FACETS.map((f) => (f.key === 'category' ? { ...f, values: f.values.filter((v) => v.value === 'ceiling') } : f));
    render(<MegaMenu facets={partial} />);
    await user.click(screen.getByRole('button', { name: 'Product type' }));
    const links = Array.from(document.querySelectorAll('#menu-category a')).map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/shop/category/ceiling']);
  });

  it('opens a panel of real landing-page links', async () => {
    const user = userEvent.setup();
    render(menu());
    const type = screen.getByRole('button', { name: 'Product type' });
    await user.click(type);
    expect(type).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Column arrays' })).toHaveAttribute('href', '/shop/category/column-array');
  });

  it('closes with Escape from inside the panel and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(menu());
    const type = screen.getByRole('button', { name: 'Product type' });
    await user.click(type);
    await user.tab();
    expect(screen.getAllByRole('link')[0]).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(type).toHaveAttribute('aria-expanded', 'false');
    expect(type).toHaveFocus();
  });

  it('closes on a click outside the menu', async () => {
    const user = userEvent.setup();
    render(
      <div>
        {menu()}
        <p>elsewhere</p>
      </div>,
    );
    const type = screen.getByRole('button', { name: 'Product type' });
    await user.click(type);
    await user.click(screen.getByText('elsewhere'));
    expect(type).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes when keyboard focus leaves the menu', async () => {
    const user = userEvent.setup();
    render(
      <div>
        {menu()}
        <button type="button">next control</button>
      </div>,
    );
    const type = screen.getByRole('button', { name: 'Product type' });
    await user.click(type);
    act(() => screen.getByRole('button', { name: 'next control' }).focus());
    expect(type).toHaveAttribute('aria-expanded', 'false');
  });

  it('stays open while focus moves between controls inside the menu', async () => {
    const user = userEvent.setup();
    render(menu());
    const type = screen.getByRole('button', { name: 'Product type' });
    await user.click(type);
    await user.tab();
    expect(type).toHaveAttribute('aria-expanded', 'true');
  });

  it('only one panel is open at a time', async () => {
    const user = userEvent.setup();
    render(menu());
    await user.click(screen.getByRole('button', { name: 'Product type' }));
    await user.click(screen.getByRole('button', { name: 'Venue' }));
    expect(screen.getByRole('button', { name: 'Product type' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Venue' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('is not a positioned box, so the sticky header is the dropdown containing block', async () => {
    const user = userEvent.setup();
    const { container } = render(menu());
    expect((container.firstElementChild as HTMLElement).className.split(/\s+/)).not.toContain('relative');
    await user.click(screen.getByRole('button', { name: 'Product type' }));
    const panel = document.getElementById('menu-category') as HTMLElement;
    expect(panel.className).toContain('absolute');
    expect(panel.className).toContain('left-0');
    expect(panel.className).toContain('right-0');
    expect(panel.className).toContain('top-full');
  });
});
