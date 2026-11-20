import { isValidElement, type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PRODUCTS } from '@/lib/catalog/fixtures';

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
);
vi.mock('next/navigation', () => ({ notFound }));

import CheckoutPage, { dynamic, metadata } from '@/app/checkout/[token]/page';

const TOKEN = 'k9Xq2LmZ7pRt4VbN8cYw3HsA';
const render = (token: string) => CheckoutPage({ params: Promise.resolve({ token }) });

beforeEach(() => {
  notFound.mockClear();
  vi.unstubAllEnvs();
  vi.stubEnv('CHECKOUT_LINK_TOKEN', TOKEN);
});

describe('/checkout/[token] page', () => {
  it('404s on a wrong token', async () => {
    for (const token of ['wrong-token-wrong-token-wrong', `${TOKEN}x`, TOKEN.toLowerCase(), 'a', '..']) {
      await expect(render(token)).rejects.toThrow('NEXT_NOT_FOUND');
    }
    expect(notFound).toHaveBeenCalledTimes(5);
  });

  it('404s on EVERY token while the checkout is closed (token unset, too short or not URL-safe)', async () => {
    for (const configured of ['', 'short', `${TOKEN}/../x`]) {
      vi.stubEnv('CHECKOUT_LINK_TOKEN', configured);
      await expect(render(TOKEN)).rejects.toThrow('NEXT_NOT_FOUND');
      await expect(render(configured)).rejects.toThrow('NEXT_NOT_FOUND');
    }
  });

  it('renders the checkout for the right token, handing the token and the WHOLE catalogue to the client', async () => {
    const tree = (await render(TOKEN)) as ReactElement;
    expect(notFound).not.toHaveBeenCalled();
    const found: ReactElement[] = [];
    const walk = (node: unknown) => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!isValidElement(node)) return;
      const el = node as ReactElement<{ children?: unknown; token?: string; index?: Record<string, unknown> }>;
      if (typeof el.props.token === 'string') found.push(el);
      walk(el.props.children);
    };
    walk(tree);
    expect(found).toHaveLength(1);
    const props = found[0].props as { token: string; index: Record<string, { packs: { price: number }[] }> };
    expect(props.token).toBe(TOKEN);
    expect(Object.keys(props.index).sort()).toEqual(PRODUCTS.map((p) => p.id).sort());
    // The index is a plain object so it can cross the server/client boundary.
    expect(Object.getPrototypeOf(props.index)).toBe(Object.prototype);
  });

  it('is never statically built, never indexed, and has no canonical URL', () => {
    expect(dynamic).toBe('force-dynamic');
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates).toBeUndefined();
  });
});
