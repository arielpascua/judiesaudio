import Link from 'next/link';
import { FAMILIES, SIGNAL_CHAIN } from '@/lib/home';

// The model-family names are Filipino words for what each family does. They are
// laid over a plain signal chain (source, processor, amplifier, speaker) so a
// buyer can see where each family sits. Nothing here is a claim about performance.

export function Families() {
  return (
    <section className="on-dark grid-paper bg-graphite py-16 text-chalk" aria-labelledby="families">
      <div className="container-page">
        <p className="eyebrow">Model families</p>
        <h2 id="families" className="mt-3 max-w-3xl text-4xl sm:text-5xl">
          Seven families, named for what they do.
        </h2>
        <p className="mt-4 max-w-2xl text-chalk/80">
          Each family carries a Filipino name. Read left to right, the chain below is how sound travels:
          from a source, through a processor and an amplifier, out of the speakers.
        </p>

        <ol className="mt-10 grid gap-px border border-chalk/30 bg-chalk/30 lg:grid-cols-4" aria-label="The signal chain">
          {SIGNAL_CHAIN.map((link, i) => (
            <li key={link.stage} className="relative bg-graphite p-5">
              <p className="readout text-xs text-chalk/70">{String(i + 1).padStart(2, '0')}</p>
              <p className="mt-2 font-display text-3xl">{link.label}</p>
              <p className="mt-2 text-sm text-chalk/80">{link.note}</p>
              {i < SIGNAL_CHAIN.length - 1 && (
                <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width={24} height={24} className="absolute -bottom-3 left-6 z-10 bg-graphite text-chalk lg:-right-3 lg:bottom-auto lg:left-auto lg:top-8" fill="none" stroke="currentColor" strokeWidth={1.6}>
                  <path d="M12 4v16m0 0-5-5m5 5 5-5" className="lg:hidden" />
                  <path d="M4 12h16m0 0-5-5m5 5-5 5" className="hidden lg:block" />
                </svg>
              )}
            </li>
          ))}
        </ol>

        <ul className="mt-10 grid gap-px border border-chalk/30 bg-chalk/30 sm:grid-cols-2 lg:grid-cols-4">
          {FAMILIES.map((family) => (
            <li key={family.series} className="bg-graphite">
              <Link href={`/shop/category/${family.category}`} className="flex h-full min-h-[44px] flex-col p-5 hover:bg-chalk hover:text-ink">
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] opacity-80">{family.stage === 'system' ? 'Whole chain' : family.stage}</span>
                <span className="mt-3 font-display text-4xl leading-none">{family.series}</span>
                <span className="mt-1 font-display text-lg italic opacity-90">{family.meaning}</span>
                <span className="mt-3 text-sm opacity-90">{family.role}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
