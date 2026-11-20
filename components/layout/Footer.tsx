import Link from 'next/link';
import { WordmarkGlyph } from '@/components/layout/Wordmark';
import { CONTACT_EMAIL, CONTACT_PHONE, IMAGE_DISCLOSURE, SITE_NAME, TAGLINE, formatPhone } from '@/lib/site';

// No founding year, no address, no hours: none has been supplied. Contact lines
// appear only when the owner sets NEXT_PUBLIC_CONTACT_EMAIL / _PHONE.
export function Footer() {
  return (
    <footer className="on-dark mt-24 bg-graphite text-chalk">
      <div className="tick-rule text-chalk" aria-hidden="true" />
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="flex items-center gap-3 font-display text-3xl">
            <WordmarkGlyph className="text-chalk" />
            {SITE_NAME}
          </p>
          <p className="mt-3 max-w-md text-sm text-chalk/80">{TAGLINE}</p>
          {(CONTACT_EMAIL || CONTACT_PHONE) && (
            <ul className="mt-4 space-y-1 font-mono text-sm">
              {CONTACT_EMAIL && <li><a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li>}
              {CONTACT_PHONE && <li><a className="underline" href={`tel:${CONTACT_PHONE}`}>{formatPhone(CONTACT_PHONE)}</a></li>}
            </ul>
          )}
        </div>
        <nav aria-label="Shop">
          <p className="eyebrow">Shop</p>
          <ul className="mt-3 space-y-1 text-sm">
            <li><Link className="inline-flex min-h-[44px] items-center" href="/shop">All products</Link></li>
            <li><Link className="inline-flex min-h-[44px] items-center" href="/shop/category/ceiling">Ceiling speakers</Link></li>
            <li><Link className="inline-flex min-h-[44px] items-center" href="/shop/category/amplification">Amplifiers &amp; DSP</Link></li>
            <li><Link className="inline-flex min-h-[44px] items-center" href="/shop/category/system">Complete systems</Link></li>
          </ul>
        </nav>
        <nav aria-label="Help">
          <p className="eyebrow">Help</p>
          <ul className="mt-3 space-y-1 text-sm">
            <li><Link className="inline-flex min-h-[44px] items-center" href="/inquiry">Send an inquiry</Link></li>
            <li><Link className="inline-flex min-h-[44px] items-center" href="/help">How inquiries work</Link></li>
            <li><Link className="inline-flex min-h-[44px] items-center" href="/about">About {SITE_NAME}</Link></li>
            <li><Link className="inline-flex min-h-[44px] items-center" href="/legal/terms">Terms</Link></li>
            <li><Link className="inline-flex min-h-[44px] items-center" href="/legal/privacy">Privacy</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-chalk/20 py-5 text-center text-xs text-chalk/80">
        <p className="mx-auto max-w-2xl px-4 text-xs">{IMAGE_DISCLOSURE}</p>
        <p className="mt-2 font-mono">© {new Date().getFullYear()} {SITE_NAME}</p>
      </div>
    </footer>
  );
}
