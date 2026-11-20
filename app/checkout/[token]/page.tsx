import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CheckoutClient } from '@/components/checkout/CheckoutClient';
import { buildCatalogueIndex, toPlainIndex } from '@/lib/catalog';
import { fetchProducts } from '@/lib/catalog/client';
import { isValidCheckoutToken } from '@/lib/checkout/link';

// THE ONE CHECKOUT. It exists only for someone who holds /checkout/<token>:
// a wrong token, or no configured token at all (checkout closed), is a plain 404,
// and POST /api/checkout enforces the same gate on its own. No other route
// renders a checkout, and nothing public links here.
export const metadata: Metadata = {
  title: 'Purchase order',
  robots: { index: false, follow: false },
};

// The token comes from the environment at request time and prices are what the
// customer is about to pay, so this page must never be statically built.
export const dynamic = 'force-dynamic';

export default async function CheckoutPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isValidCheckoutToken(token)) notFound();

  const products = await fetchProducts();
  // A null-prototype index cannot cross the server/client boundary, so pass a
  // plain copy; CheckoutClient restores the null-prototype lookup.
  const index = toPlainIndex(buildCatalogueIndex(products));

  return (
    <div className="container-page py-10 lg:py-14">
      <header className="max-w-3xl">
        <p className="eyebrow">Purchase order</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">Your order</h1>
        <p className="mt-4 text-ink-muted">
          Choose products and packs, tell us who is buying and where it goes, then pay on Maya’s own page. Maya
          doesn’t tell us when a payment is made, so we match each payment to its order by hand and the order stays
          pending until then.
        </p>
      </header>
      <div className="mt-10">
        <CheckoutClient token={token} index={index} />
      </div>
    </div>
  );
}
