// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';
import { MobileNav } from '@/components/layout/MobileNav';
import { FACETS } from '@/lib/shop/facets';

// jsdom has no showModal/close; stub just enough to model the dialog.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

const dialog = () => document.querySelector('dialog') as HTMLDialogElement;
const nav = () => <MobileNav facets={FACETS} />;

describe('MobileNav', () => {
  it('opens from the menu button and closes with the close button', async () => {
    const user = userEvent.setup();
    render(nav());
    expect(dialog()).not.toHaveAttribute('open');
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(dialog()).toHaveAttribute('open');
    expect(screen.getByRole('link', { name: 'All products' })).toHaveAttribute('href', '/shop');
    await user.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(dialog()).not.toHaveAttribute('open');
  });

  it('has one section per facet it is given, each with real landing links', () => {
    render(nav());
    const summaries = Array.from(document.querySelectorAll('dialog summary')).map((s) => s.textContent);
    expect(summaries).toEqual(FACETS.map((f) => `Shop by ${f.label.toLowerCase()}`));
    expect(document.querySelector('a[href="/shop/application/worship"]')).not.toBeNull();
  });

  it('every link in the menu is at least 44px tall', async () => {
    const user = userEvent.setup();
    render(nav());
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const links = Array.from(document.querySelectorAll('dialog a'));
    expect(links.length).toBeGreaterThan(10);
    for (const link of links) expect(link.className, link.textContent ?? '').toContain('min-h-[44px]');
  });

  it('closes when the backdrop (the dialog element itself) is clicked, but not its content', async () => {
    const user = userEvent.setup();
    render(nav());
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await user.click(screen.getByText('Menu'));
    expect(dialog()).toHaveAttribute('open');
    await user.click(dialog());
    expect(dialog()).not.toHaveAttribute('open');
  });

  it('closes after following a link', async () => {
    const user = userEvent.setup();
    render(nav());
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await user.click(screen.getByRole('link', { name: 'All products' }));
    expect(dialog()).not.toHaveAttribute('open');
  });
});
