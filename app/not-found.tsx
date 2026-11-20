import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <p className="readout text-7xl text-cobalt sm:text-9xl">404</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">No signal on that page</h1>
      <p className="mt-4 text-ink-muted">The link may be old, or the page may have moved.</p>
      <Link href="/shop" className="btn-primary mt-8">Browse the models</Link>
    </div>
  );
}
