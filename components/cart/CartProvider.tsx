'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useCartStore } from '@/lib/cart/store';

interface CartUi {
  hydrated: boolean;
}

const CartUiContext = createContext<CartUi | null>(null);

/**
 * Only used by the link-only /checkout/<token> page. The persisted order holds ids
 * and quantities only; prices come from the server. It is rehydrated here after mount so the
 * first client render matches the server.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    Promise.resolve(useCartStore.persist.rehydrate())
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  const value = useMemo(() => ({ hydrated }), [hydrated]);
  return <CartUiContext.Provider value={value}>{children}</CartUiContext.Provider>;
}

export function useCartUi(): CartUi {
  const ctx = useContext(CartUiContext);
  if (!ctx) throw new Error('useCartUi must be used inside <CartProvider>');
  return ctx;
}
