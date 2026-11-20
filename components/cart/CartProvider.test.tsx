// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CartProvider, useCartUi } from '@/components/cart/CartProvider';
import { useCartStore } from '@/lib/cart/store';

afterEach(() => {
  vi.restoreAllMocks();
  useCartStore.setState({ lines: [] });
});

function Probe() {
  const ui = useCartUi();
  return (
    <div>
      <span data-testid="hydrated">{String(ui.hydrated)}</span>
      <span data-testid="keys">{Object.keys(ui).sort().join(',')}</span>
    </div>
  );
}

describe('CartProvider', () => {
  it('flips hydrated to true after mount', async () => {
    render(
      <CartProvider>
        <Probe />
      </CartProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('hydrated')).toHaveTextContent('true'));
  });

  it('is not hydrated until the persisted cart has rehydrated', async () => {
    let release!: () => void;
    vi.spyOn(useCartStore.persist, 'rehydrate').mockReturnValue(new Promise<void>((r) => (release = r)));
    render(
      <CartProvider>
        <Probe />
      </CartProvider>,
    );
    expect(screen.getByTestId('hydrated')).toHaveTextContent('false');
    await act(async () => release());
    expect(screen.getByTestId('hydrated')).toHaveTextContent('true');
  });

  it('still becomes hydrated, without an unhandled rejection, if rehydration fails', async () => {
    vi.spyOn(useCartStore.persist, 'rehydrate').mockReturnValue(Promise.reject(new Error('storage blocked')));
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    render(
      <CartProvider>
        <Probe />
      </CartProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('hydrated')).toHaveTextContent('true'));
    await new Promise((r) => setTimeout(r, 20));
    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('handles a rehydrate() that returns void', async () => {
    vi.spyOn(useCartStore.persist, 'rehydrate').mockReturnValue(undefined as never);
    render(
      <CartProvider>
        <Probe />
      </CartProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('hydrated')).toHaveTextContent('true'));
  });

  it('exposes hydration state only: no catalogue index, no drawer', async () => {
    render(
      <CartProvider>
        <Probe />
      </CartProvider>,
    );
    expect(screen.getByTestId('keys')).toHaveTextContent(/^hydrated$/);
  });

  it('useCartUi throws outside a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('useCartUi must be used inside <CartProvider>');
  });
});
