// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HelpPage from '@/app/help/page';
import { DELIVERY_NOTE } from '@/lib/site';

describe('Help page', () => {
  it('explains inquiries: browse, send an inquiry, we follow up; no promise of timing or a quote', () => {
    const { container } = render(<HelpPage />);
    const text = (container.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('We follow up using the contact details you gave.');
    expect(container.querySelector('a[href="/inquiry"]')).not.toBeNull();
    expect(container.querySelector('a[href="/shop"]')).not.toBeNull();
    expect(text).not.toMatch(/secure|quote|within|hours|business days|delivery|reply|respond/i);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
  });

  it('answers the constant-voltage versus low-impedance question and the datasheet question', () => {
    const { container } = render(<HelpPage />);
    const text = (container.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('What is the difference between constant-voltage and low-impedance?');
    expect(text).toMatch(/70 V or 100 V/);
    expect(text).toMatch(/transformer/);
    expect(text).toContain('How do I read a datasheet?');
  });

  it('shows contact only when the owner has set it (none in tests), and invents none', () => {
    const { container } = render(<HelpPage />);
    expect(container.querySelector('a[href^="mailto:"], a[href^="tel:"]')).toBeNull();
  });

  it('has no price, payment or Maya wording and does not render the checkout delivery note', () => {
    const { container } = render(<HelpPage />);
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/₱|price|pricing|peso|maya|\bpay\b|payment/i);
    expect(text).not.toContain(DELIVERY_NOTE);
  });

  it('carries nothing from the rug store', () => {
    const { container } = render(<HelpPage />);
    expect(container.textContent).not.toMatch(/taruuv|\brugs?\b|carpet/i);
  });
});
