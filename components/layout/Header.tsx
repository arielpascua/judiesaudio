import Link from 'next/link';
import { fetchPublicProducts } from '@/lib/catalog/client';
import { availableFacets } from '@/lib/shop/landing';
import { MegaMenu } from './MegaMenu';
import { MobileNav } from './MobileNav';
import { SearchIcon } from './icons';
import { Wordmark } from './Wordmark';

// The header ROW is sticky (h-16 plus a 1px border = 65px; globals.css keeps
// html scroll-padding-top above that so anchors and the skip link are not hidden
// under it). The sticky header is also the ONLY positioned ancestor of the
// mega-menu dropdown (see MegaMenu), so the panel spans the full header width.
//
// The menus get only the facet values that have at least one product, so a menu
// link can never lead to a 404. There is no link to /checkout anywhere here.
export async function Header() {
  const facets = availableFacets(await fetchPublicProducts());
  return (
    <header className="sticky top-0 z-40 border-b border-ink bg-chalk">
      <div className="container-page flex h-16 items-center gap-3 lg:gap-4">
        <MobileNav facets={facets} />
        <Wordmark />
        <nav aria-label="Shop by" className="ml-4 hidden lg:block">
          <MegaMenu facets={facets} />
        </nav>
        <form action="/search" role="search" aria-label="Site search" className="ml-auto hidden max-w-[16rem] flex-1 xl:block">
          <label htmlFor="site-search" className="sr-only">Search models</label>
          <div className="flex items-center gap-2 border border-ink-muted bg-white px-3 focus-within:border-ink focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-cobalt">
            <SearchIcon className="shrink-0 text-ink-muted" />
            <input id="site-search" name="q" type="search" placeholder="Search models" maxLength={80} className="h-11 w-full bg-transparent text-sm placeholder:text-ink-muted focus-visible:outline-none" />
          </div>
        </form>
        <Link href="/search" className="ml-auto inline-flex h-11 w-11 items-center justify-center xl:hidden" aria-label="Search">
          <SearchIcon />
        </Link>
        <Link href="/inquiry" className="btn-primary shrink-0 px-4">Inquire</Link>
      </div>
    </header>
  );
}
