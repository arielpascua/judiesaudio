import type { Metadata } from 'next';
import { CartProvider } from '@/components/cart/CartProvider';

// The checkout is reachable only through its secret link: never indexed, never
// followed, no canonical URL (a canonical would publish the secret path).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Only the checkout needs the persisted order rehydrated.
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
