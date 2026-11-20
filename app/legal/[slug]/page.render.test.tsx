// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const contact = vi.hoisted(() => ({ email: null as string | null }));
vi.mock('@/lib/site', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/site')>();
  return {
    ...actual,
    get CONTACT_EMAIL() {
      return contact.email;
    },
  };
});

import LegalPage from '@/app/legal/[slug]/page';

beforeEach(() => {
  contact.email = null;
});

describe('Privacy page contact channel', () => {
  it.each(['privacy'])('%s: renders "Email us at <address>" as a mailto link when a contact email is configured', async (slug) => {
    contact.email = 'hello@judiesaudio.test';
    render(await LegalPage({ params: Promise.resolve({ slug }) }));
    const link = screen.getByRole('link', { name: 'hello@judiesaudio.test' });
    expect(link).toHaveAttribute('href', 'mailto:hello@judiesaudio.test');
    expect(screen.getByText(/Email us at/)).toBeInTheDocument();
  });

  it.each(['privacy'])('%s: points at the inquiry form, and invents no address, when no contact email is configured', async (slug) => {
    const { container } = render(await LegalPage({ params: Promise.resolve({ slug }) }));
    expect(screen.getByRole('link', { name: /inquiry form/i })).toHaveAttribute('href', '/inquiry');
    expect(container.textContent).not.toMatch(/@/);
    expect(container.textContent).not.toMatch(/emailing us/i);
    expect(screen.queryByText(/Email us at/)).not.toBeInTheDocument();
  });

  it('privacy, no contact email: tells the visitor to send an inquiry and say they want their information deleted', async () => {
    const { container } = render(await LegalPage({ params: Promise.resolve({ slug: 'privacy' }) }));
    expect(container.textContent).toContain('Send us an inquiry through the inquiry form and say you want your information deleted.');
  });

  it('privacy, contact email set: the deletion channel is the address, not the inquiry form', async () => {
    contact.email = 'hello@judiesaudio.test';
    const { container } = render(await LegalPage({ params: Promise.resolve({ slug: 'privacy' }) }));
    expect(container.textContent).toContain('hello@judiesaudio.test');
    expect(screen.queryByRole('link', { name: /inquiry form/i })).not.toBeInTheDocument();
  });

  it('does not add the contact section to the terms page', async () => {
    contact.email = 'hello@judiesaudio.test';
    const { container } = render(await LegalPage({ params: Promise.resolve({ slug: 'terms' }) }));
    expect(container.textContent).not.toContain('hello@judiesaudio.test');
  });
});
