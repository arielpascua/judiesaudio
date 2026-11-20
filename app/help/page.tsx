import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT_EMAIL, CONTACT_PHONE, formatPhone } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Help',
  description: 'How inquiries work, how to read a datasheet, and the difference between constant-voltage and low-impedance speaker lines.',
  alternates: { canonical: '/help' },
};

// Plain, generic and correct. No reply time, quote promise, delivery term or price.
const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: 'Does sending an inquiry place an order?',
    a: 'No. An inquiry is a request for information. It commits neither you nor us to anything.',
  },
  {
    q: 'What should I put in an inquiry?',
    a: 'Your company, a contact name and an email address are required. List the models, packs and quantities you have in mind. A note about the venue and what it is used for helps the people reading it.',
  },
  {
    q: 'What happens after I send one?',
    a: 'It is saved and we follow up using the details you gave. If saving fails you are told so on the page, and nothing is reported as sent.',
  },
  {
    q: 'How do I read a datasheet?',
    a: (
      <>
        The specification table lists bandwidth at −10 dB, maximum sound level at 1 m, continuous power,
        impedance, whether the unit takes a 70 V or 100 V line, coverage, drivers, ingress protection,
        weight and dimensions. The graph beside it is drawn from the two bandwidth figures. A value of
        “Not applicable” means the number has no meaning for that product, for example bandwidth on an amplifier.
      </>
    ),
  },
  {
    q: 'What is the difference between constant-voltage and low-impedance?',
    a: (
      <>
        A low-impedance (for example 8 Ω) line connects speakers directly to an amplifier channel, and the
        amplifier must be sized for the combined load. A constant-voltage line (70 V or 100 V) carries a
        higher voltage so many speakers can share one long cable. Each speaker has a transformer with
        selectable power taps, and the taps add up to no more than the amplifier’s rating. Ceiling
        speakers are usually constant-voltage; subwoofers and stage cabinets are usually low-impedance.
        The table says which a model takes.
      </>
    ),
  },
  {
    q: 'Are the drawings photographs?',
    a: 'No. They are schematics generated from each model’s specification. Finishes and proportions on the delivered product are as stated on its datasheet.',
  },
];

export default function HelpPage() {
  return (
    <div className="container-page max-w-3xl py-12">
      <p className="eyebrow">Help</p>
      <h1 className="mt-3 text-5xl sm:text-7xl">How inquiries work</h1>
      <ol className="mt-8 list-decimal space-y-4 pl-6 text-lg leading-relaxed text-ink-muted marker:font-mono marker:text-cobalt">
        <li>
          <Link className="underline" href="/shop">Browse the datasheets</Link> and note the models, packs and quantities you need.
        </li>
        <li>
          Send an inquiry from a model’s page or from the <Link className="underline" href="/inquiry">inquiry page</Link>.
        </li>
        <li>We follow up using the contact details you gave.</li>
      </ol>

      <section className="mt-14" aria-labelledby="faq">
        <h2 id="faq" className="border-t border-ink pt-4 text-3xl">Questions</h2>
        <div className="mt-4 divide-y divide-line border-y border-line">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-1">
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 py-2 font-medium [&::-webkit-details-marker]:hidden">
                {item.q}
                <span aria-hidden className="font-mono text-xl group-open:rotate-45">+</span>
              </summary>
              <p className="pb-4 leading-relaxed text-ink-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <p className="mt-10 text-sm text-ink-muted">
        See our <Link className="underline" href="/legal/terms">terms</Link> and{' '}
        <Link className="underline" href="/legal/privacy">privacy</Link> pages.
        {CONTACT_EMAIL ? (
          <> Questions? Email <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</>
        ) : null}
        {CONTACT_PHONE ? (
          <> Phone <a className="underline" href={`tel:${CONTACT_PHONE}`}>{formatPhone(CONTACT_PHONE)}</a>.</>
        ) : null}
      </p>
    </div>
  );
}
