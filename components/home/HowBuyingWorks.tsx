import Link from 'next/link';

// Three plain steps. No reply time, no quote promise and no price: none has been supplied.
const STEPS = [
  {
    title: 'Browse the datasheets',
    body: 'Every model has its specification table and a frequency-response graph drawn from the same numbers. Filter by product type, venue, mounting and power.',
    href: '/shop',
    cta: 'Open the shop',
  },
  {
    title: 'Send an inquiry',
    body: 'Tell us your business and list the models, packs and quantities you are interested in. Add a note about the venue if it helps.',
    href: '/inquiry',
    cta: 'Start an inquiry',
  },
  {
    title: 'We follow up',
    body: 'We contact you using the details you gave, about the models you listed.',
    href: '/help',
    cta: 'How inquiries work',
  },
];

export function HowBuyingWorks() {
  return (
    <section className="container-page py-16" aria-labelledby="how">
      <p className="eyebrow">How buying works</p>
      <h2 id="how" className="mt-3 max-w-3xl text-4xl sm:text-5xl">Three steps from datasheet to inquiry.</h2>
      <ol className="mt-10 grid gap-0 border-y border-ink md:grid-cols-3 md:divide-x md:divide-ink">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex flex-col border-b border-line p-6 last:border-b-0 md:border-b-0">
            <p className="readout text-5xl text-cobalt">{String(i + 1).padStart(2, '0')}</p>
            <h3 className="mt-4 font-display text-3xl">{step.title}</h3>
            <p className="mt-3 flex-1 text-ink-muted">{step.body}</p>
            <Link href={step.href} className="mt-5 inline-flex min-h-[44px] items-center font-mono text-xs font-medium uppercase tracking-[0.12em] text-cobalt underline underline-offset-4">
              {step.cta} →
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
