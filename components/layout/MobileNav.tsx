'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { FacetDef } from '@/lib/shop/facets';
import { CloseIcon, MenuIcon } from './icons';

export function MobileNav({ facets }: { facets: readonly FacetDef[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal?.();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 w-11 items-center justify-center lg:hidden"
        aria-label="Open menu"
      >
        <MenuIcon />
      </button>
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // The backdrop is part of the dialog element: a click whose target is
          // the dialog itself (not its content) is a click outside the panel.
          if (e.target === e.currentTarget) setOpen(false);
        }}
        className="m-0 h-full max-h-none w-[min(22rem,90vw)] max-w-none bg-chalk p-0 text-ink backdrop:bg-ink/50"
        aria-label="Menu"
      >
        <div className="flex items-center justify-between border-b border-ink px-4 py-3">
          <span className="eyebrow">Menu</span>
          <button type="button" onClick={() => setOpen(false)} className="h-11 w-11" aria-label="Close menu">
            <CloseIcon />
          </button>
        </div>
        <nav className="overflow-y-auto px-4 pb-10" aria-label="Shop by">
          {facets.map((facet) => (
            <details key={facet.key} className="border-b border-line py-1">
              <summary className="flex min-h-[44px] cursor-pointer items-center font-mono text-[12px] font-medium uppercase tracking-[0.1em]">
                Shop by {facet.label.toLowerCase()}
              </summary>
              <ul className="pb-3">
                {facet.values.map((v) => (
                  <li key={v.value}>
                    <Link
                      href={`/shop/${facet.key}/${v.value}`}
                      onClick={() => setOpen(false)}
                      className="flex min-h-[44px] items-center pl-3 text-sm"
                    >
                      {v.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
          <Link href="/shop" onClick={() => setOpen(false)} className="flex min-h-[44px] items-center font-mono text-[12px] font-medium uppercase tracking-[0.1em]">
            All products
          </Link>
          <Link href="/about" onClick={() => setOpen(false)} className="flex min-h-[44px] items-center font-mono text-[12px] font-medium uppercase tracking-[0.1em]">
            About
          </Link>
          <Link href="/help" onClick={() => setOpen(false)} className="flex min-h-[44px] items-center font-mono text-[12px] font-medium uppercase tracking-[0.1em]">
            Help
          </Link>
        </nav>
      </dialog>
    </>
  );
}
