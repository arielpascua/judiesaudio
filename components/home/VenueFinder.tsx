'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { AREA_BANDS, inquiryHref, type VenueResult } from '@/lib/home';

// A venue finder that is only navigation. It offers no acoustic advice and no
// sizing numbers: the catalogue decides which models match a venue, and the
// floor area is just carried into the inquiry so the people reading it have it.
// Without JavaScript the radio group still works: it is a GET form into the shop.

export function VenueFinder({ venues }: { venues: readonly VenueResult[] }) {
  const [venue, setVenue] = useState<string>('');
  const [area, setArea] = useState<string>('');
  const resultId = useId();
  const selected = venues.find((v) => v.venue === venue) ?? null;

  return (
    <section className="container-page py-16" aria-labelledby="venue-finder">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:gap-14">
        <div>
          <p className="eyebrow">Venue finder</p>
          <h2 id="venue-finder" className="mt-3 text-4xl sm:text-5xl">Start from the room.</h2>
          <p className="mt-4 max-w-md text-ink-muted">
            Pick a venue and see which product types in the catalogue are listed for it. It is a way into
            the shop, not a design: the layout for your room is something to talk through in an inquiry.
          </p>
        </div>

        <form action="/shop" method="get" className="border border-ink bg-white p-5 sm:p-6">
          <fieldset>
            <legend className="eyebrow">Where will it be installed?</legend>
            <div className="mt-3 grid gap-2 min-[480px]:grid-cols-2">
              {venues.map((v) => (
                <div key={v.venue}>
                  <input
                    id={`venue-${v.venue}`}
                    type="radio"
                    name="application"
                    value={v.venue}
                    checked={venue === v.venue}
                    onChange={() => setVenue(v.venue)}
                    className="peer sr-only"
                  />
                  <label
                    htmlFor={`venue-${v.venue}`}
                    className="flex min-h-[44px] cursor-pointer items-center border border-ink-muted px-3 text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-chalk peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cobalt hover:border-ink"
                  >
                    {v.venueLabel}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>

          <div className="mt-5">
            <label htmlFor="venue-area" className="eyebrow">Floor area (optional)</label>
            <select id="venue-area" value={area} onChange={(e) => setArea(e.target.value)} className="field">
              <option value="">Skip</option>
              {AREA_BANDS.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>

          <div id={resultId} role="status" aria-live="polite" className="mt-6 border-t border-line pt-5">
            {selected ? (
              <>
                <p className="font-display text-2xl">{selected.venueLabel}</p>
                <p className="readout mt-1 text-sm text-ink-muted">
                  {selected.total} {selected.total === 1 ? 'model' : 'models'} in the catalogue
                </p>
                <ul className="mt-4 divide-y divide-line border-y border-line">
                  {selected.categories.map((c) => (
                    <li key={c.category}>
                      <Link href={c.href} className="flex min-h-[44px] items-center justify-between gap-3 py-2 text-sm hover:text-cobalt">
                        <span>{c.label}</span>
                        <span className="readout text-ink-muted">{c.count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={selected.shopHref} className="btn-primary">See all {selected.total}</Link>
                  <Link href={inquiryHref(selected.venue, area || undefined)} className="btn-outline">Ask about this venue</Link>
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-muted">Choose a venue to see the product types listed for it.</p>
            )}
          </div>

          {/* Only reachable as the no-JavaScript path: with JavaScript the result above already links on. */}
          <noscript>
            <button type="submit" className="btn-primary mt-4">Show the models</button>
          </noscript>
        </form>
      </div>
    </section>
  );
}
