import Link from 'next/link';

export function HomeCta() {
  return (
    <section className="on-dark bg-graphite py-16 text-chalk" aria-labelledby="cta">
      <div className="container-page flex flex-wrap items-end justify-between gap-8">
        <div className="max-w-2xl">
          <p className="eyebrow">Next</p>
          <h2 id="cta" className="mt-3 text-4xl sm:text-6xl">Tell us what the room needs.</h2>
          <p className="mt-4 text-chalk/80">
            List the models you have in mind, or just the kind of venue. An inquiry commits neither of us to anything.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/inquiry" className="btn-signal">Send an inquiry</Link>
          <Link href="/shop" className="btn-outline">Browse all models</Link>
        </div>
      </div>
    </section>
  );
}
