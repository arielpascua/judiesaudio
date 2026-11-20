'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startTransition } from 'react';

// Root error boundary: any uncaught error while rendering a page lands here,
// inside the normal header and footer, instead of Next's bare default screen.
// It deliberately shows nothing from the error itself (messages can echo
// configuration or data); Next logs the real error on the server.
//
// app/global-error.tsx is not needed: the root layout is simple and this
// boundary sits below it.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  // reset() alone only re-renders the client tree; a failed server component would
  // be re-thrown from the cached payload. refresh() fetches a fresh one first.
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });
  return (
    <div className="container-page max-w-2xl py-20 text-center">
      <p className="eyebrow">Error</p>
      <h1 className="mt-2 text-5xl">Something went wrong</h1>
      <p className="mt-4 text-ink-muted">We couldn’t load this page. Try again or head back to the shop.</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={retry} className="btn-primary">
          Try again
        </button>
        <Link href="/shop" className="btn-outline">
          Back to the shop
        </Link>
      </div>
    </div>
  );
}
