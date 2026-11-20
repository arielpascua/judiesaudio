// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { VenueFinder } from '@/components/home/VenueFinder';
import { PRODUCTS } from '@/lib/catalog/fixtures';
import { toPublicProducts } from '@/lib/catalog/public';
import { APPLICATIONS } from '@/lib/catalog/types';
import { venueResult } from '@/lib/home';

const venues = APPLICATIONS.map((v) => venueResult(toPublicProducts(PRODUCTS), v));

describe('VenueFinder', () => {
  it('starts with no venue chosen and says what to do', () => {
    render(<VenueFinder venues={venues} />);
    expect(screen.getAllByRole('radio')).toHaveLength(8);
    expect(screen.queryByRole('radio', { checked: true })).toBeNull();
    expect(screen.getByText(/Choose a venue/)).toBeInTheDocument();
  });

  it('is a GET form into the shop, so it works without JavaScript', () => {
    const { container } = render(<VenueFinder venues={venues} />);
    const form = container.querySelector('form')!;
    expect(form).toHaveAttribute('action', '/shop');
    expect(form).toHaveAttribute('method', 'get');
    expect(screen.getAllByRole('radio').every((r) => r.getAttribute('name') === 'application')).toBe(true);
  });

  it('choosing a venue lists its product types with true counts, linking to filtered shop URLs', async () => {
    const user = userEvent.setup();
    render(<VenueFinder venues={venues} />);
    await user.click(screen.getByLabelText('Houses of worship'));
    const result = screen.getByRole('status');
    const worship = venues.find((v) => v.venue === 'worship')!;
    expect(within(result).getByText(`${worship.total} models in the catalogue`)).toBeInTheDocument();
    for (const c of worship.categories) {
      const link = within(result).getByRole('link', { name: new RegExp(`^${c.label}`) });
      expect(link).toHaveAttribute('href', `/shop?application=worship&category=${c.category}`);
    }
    expect(within(result).getByRole('link', { name: `See all ${worship.total}` })).toHaveAttribute('href', '/shop/application/worship');
  });

  it('carries the optional floor area into the inquiry link, and omits it when skipped', async () => {
    const user = userEvent.setup();
    render(<VenueFinder venues={venues} />);
    await user.click(screen.getByLabelText('Retail & showrooms'));
    expect(screen.getByRole('link', { name: 'Ask about this venue' })).toHaveAttribute('href', '/inquiry?venue=retail');
    await user.selectOptions(screen.getByLabelText(/Floor area/), '50-150');
    expect(screen.getByRole('link', { name: 'Ask about this venue' })).toHaveAttribute('href', '/inquiry?venue=retail&area=50-150');
  });

  it('gives no sizing advice and no money wording; every control meets the 44px target', async () => {
    const user = userEvent.setup();
    const { container } = render(<VenueFinder venues={venues} />);
    await user.click(screen.getByLabelText('Gyms & studios'));
    expect(container.textContent).not.toMatch(/recommend|ideal|per square|watts per|₱|price/i);
    for (const label of container.querySelectorAll('label.cursor-pointer')) expect(label.className).toContain('min-h-[44px]');
    expect(container.innerHTML).not.toMatch(/rounded/);
  });
});
