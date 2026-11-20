'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { FacetDef } from '@/lib/shop/facets';
import { ChevronIcon } from './icons';

/** The ways of browsing that get a dropdown. Power and finish are filters on the shop page. */
const MENU_KEYS = ['category', 'application', 'mounting'];

export function MegaMenu({ facets }: { facets: readonly FacetDef[] }) {
  const menu = facets.filter((f) => MENU_KEYS.includes(f.key));
  const [open, setOpen] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        const key = open;
        setOpen(null);
        if (key) buttonRefs.current[key]?.focus();
      }
    }
    function onPointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  // Deliberately NOT positioned (no `relative`): the sticky <header> is the
  // containing block, so the dropdown spans the full header width rather than
  // just the width of these buttons.
  return (
    <div
      ref={rootRef}
      onBlur={(e) => {
        // Close when focus moves to something outside the menu. A null
        // relatedTarget (click on non-focusable area) is handled by the
        // outside-click listener, and must not close the panel on mousedown
        // in browsers that do not focus links.
        const next = e.relatedTarget as Node | null;
        if (next && rootRef.current && !rootRef.current.contains(next)) setOpen(null);
      }}
    >
      <ul className="flex items-center gap-1">
        {menu.map((facet) => {
          const isOpen = open === facet.key;
          return (
            <li key={facet.key}>
              <button
                ref={(el) => {
                  buttonRefs.current[facet.key] = el;
                }}
                type="button"
                aria-expanded={isOpen}
                aria-controls={`menu-${facet.key}`}
                onClick={() => setOpen(isOpen ? null : facet.key)}
                className="inline-flex min-h-[44px] items-center gap-1 px-3 font-mono text-[12px] font-medium uppercase tracking-[0.1em] hover:text-cobalt"
              >
                {facet.label}
                <ChevronIcon className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {isOpen && (
                <div
                  id={`menu-${facet.key}`}
                  className="absolute left-0 right-0 top-full z-30 border-b border-ink bg-chalk"
                >
                  <ul className="container-page grid grid-cols-2 gap-x-8 gap-y-1 py-6 sm:grid-cols-3 lg:grid-cols-4">
                    {facet.values.map((v) => (
                      <li key={v.value}>
                        <Link
                          href={`/shop/${facet.key}/${v.value}`}
                          onClick={() => setOpen(null)}
                          className="block border-t border-line py-3 text-sm hover:text-cobalt"
                        >
                          {v.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
        <li>
          {/* Last, so the dropdown links stay first in the tab order after their button. */}
          <Link href="/shop" className="inline-flex min-h-[44px] items-center px-3 font-mono text-[12px] font-medium uppercase tracking-[0.1em] hover:text-cobalt">
            All products
          </Link>
        </li>
      </ul>
    </div>
  );
}
