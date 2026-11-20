// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CheckoutLayout from '@/app/checkout/layout';
import { useCartUi } from '@/components/cart/CartProvider';

function Probe() {
  const { hydrated } = useCartUi();
  return <p>hydrated:{String(hydrated)}</p>;
}

describe('checkout layout', () => {
  it('renders children inside the cart provider so useCartUi works and hydration completes', async () => {
    await act(async () => {
      render(
        <CheckoutLayout>
          <Probe />
        </CheckoutLayout>,
      );
    });
    expect(screen.getByText('hydrated:true')).toBeInTheDocument();
  });
});

describe('checkout layout metadata', () => {
  it('is noindex and nofollow with no canonical (a canonical would publish the secret path)', async () => {
    const { metadata } = await import('@/app/checkout/layout');
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates).toBeUndefined();
  });
});
