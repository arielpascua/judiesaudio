'use client';

import { useEffect, useRef, type MouseEvent } from 'react';
import { ProductArt } from '@/components/art/ProductArt';
import type { CatalogueIndex } from '@/lib/catalog';
import type { ResolvedCart, UnavailableReason } from '@/lib/cart/resolve';
import { useCartStore } from '@/lib/cart/store';
import { formatPeso } from '@/lib/format';
import { MAX_LINE_QUANTITY } from '@/lib/limits';
import { fieldClass } from './Field';

const REASON: Record<UnavailableReason, string> = {
  unknown: 'no longer available',
  pack: 'that pack is no longer available',
  'out-of-stock': 'out of stock',
};

const stepButton =
  'inline-flex h-11 w-11 items-center justify-center border border-ink bg-white font-mono text-lg leading-none text-ink hover:bg-ink hover:text-chalk disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-ink';

interface Props {
  index: CatalogueIndex;
  cart: ResolvedCart;
  hydrated: boolean;
}

/**
 * The order lines, set out like the body of a purchase-order slip: a line
 * number, the item, its pack, a quantity stepper and the line amount. Every
 * price shown is resolved against the server-rendered catalogue index.
 */
export function OrderLines({ index, cart, hydrated }: Props) {
  const lines = useCartStore((s) => s.lines);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const changePack = useCartStore((s) => s.changePack);
  const remove = useCartStore((s) => s.remove);
  const heading = useRef<HTMLHeadingElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  // Removing a line deletes the button that has focus, which would drop focus to
  // <body>. Hand it to the next Remove button in the alert (else the previous one),
  // else to the section heading once the last one has gone.
  const pendingFocus = useRef<{ key: string | null } | null>(null);
  const removedLine = useRef(false);

  useEffect(() => {
    if (removedLine.current) {
      removedLine.current = false;
      heading.current?.focus();
      return;
    }
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    const next = pending.key
      ? Array.from(alertRef.current?.querySelectorAll<HTMLElement>('[data-remove-key]') ?? []).find((el) => el.dataset.removeKey === pending.key)
      : undefined;
    (next ?? heading.current)?.focus();
  }, [lines]);

  function removeUnavailable(event: MouseEvent<HTMLButtonElement>, productId: string, packId: string) {
    const buttons = Array.from(alertRef.current?.querySelectorAll<HTMLElement>('[data-remove-key]') ?? []);
    const at = buttons.indexOf(event.currentTarget);
    const neighbour = buttons[at + 1] ?? buttons[at - 1];
    pendingFocus.current = { key: neighbour?.dataset.removeKey ?? null };
    remove(productId, packId);
  }

  const packsOfProduct = (productId: string) => lines.filter((l) => l.productId === productId).reduce((n, l) => n + l.quantity, 0);

  return (
    <section aria-labelledby="order-lines">
      <div className="flex items-baseline justify-between gap-4 border-b border-ink pb-2">
        <h2 id="order-lines" ref={heading} tabIndex={-1} className="font-display text-2xl">
          Order lines
        </h2>
        <p className="eyebrow">Prices in pesos</p>
      </div>

      {!hydrated ? (
        <p role="status" className="mt-4 text-sm text-ink-muted">
          Loading your order…
        </p>
      ) : (
        <>
          {cart.unavailable.length > 0 && (
            <div ref={alertRef} role="alert" className="mt-4 border border-ink bg-chalk-deep p-4 text-sm">
              <p className="font-semibold">These items can’t be ordered and are not in your total:</p>
              <ul className="mt-2 space-y-1">
                {cart.unavailable.map(({ line, reason }) => (
                  <li key={`${line.productId}:${line.packId}`} className="flex items-center justify-between gap-3">
                    <span>
                      {index[line.productId]?.name ?? 'An item'}: {REASON[reason]}.
                    </span>
                    <button
                      type="button"
                      data-remove-key={`${line.productId}:${line.packId}`}
                      aria-label={`Remove ${index[line.productId]?.name ?? 'unavailable item'}`}
                      onClick={(e) => removeUnavailable(e, line.productId, line.packId)}
                      className="inline-flex min-h-[44px] shrink-0 items-center px-2 underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {cart.lines.length === 0 ? (
            <p className="mt-6 border border-dashed border-ink-muted p-6 text-sm text-ink-muted">
              No lines yet. Choose products under <a href="#add-products" className="underline">Add products</a> below.
            </p>
          ) : (
            <ol className="mt-2 divide-y divide-line border-b border-line">
              {cart.lines.map(({ line, product, pack, lineTotal }, i) => {
                const name = `${product.name}, ${pack.label}`;
                const used = packsOfProduct(product.id);
                const atCeiling = used >= MAX_LINE_QUANTITY;
                return (
                  <li key={`${line.productId}:${line.packId}`} className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-3 py-4">
                    <span className="readout pt-1 text-xs text-ink-muted" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="h-14 w-14 shrink-0 border border-line bg-chalk-deep sm:h-16 sm:w-16">
                      <ProductArt art={product.art} finishHex={product.finishHex} woofers={product.woofers} wooferIn={product.wooferIn} className="h-full w-full" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold">{product.name}</p>
                      <p className="text-sm text-ink-muted">
                        {product.series} · {product.finishName}
                      </p>
                      <p className="readout mt-0.5 text-xs text-ink-muted">
                        {formatPeso(pack.price)} per {pack.label.toLowerCase()}
                        {pack.units > 1 ? ` · ${pack.units} units` : ''}
                      </p>
                    </div>
                    <p className="readout text-right text-base font-medium">{formatPeso(lineTotal)}</p>

                    <div className="col-span-3 col-start-2 flex flex-wrap items-center gap-3 sm:col-span-3">
                      <div>
                        <label htmlFor={`pack-${i}`} className="sr-only">
                          Pack for {product.name}
                        </label>
                        <select
                          id={`pack-${i}`}
                          value={pack.id}
                          onChange={(e) => changePack(product.id, pack.id, e.target.value)}
                          className={`${fieldClass} mt-0 min-w-0 max-w-full sm:max-w-[16rem]`}
                        >
                          {product.packs.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label} · {formatPeso(p.price)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div role="group" aria-label={`Quantity for ${name}`} className="flex items-center">
                        <button
                          type="button"
                          aria-label={`Fewer: ${name}`}
                          onClick={() => setQuantity(product.id, pack.id, line.quantity - 1)}
                          className={stepButton}
                        >
                          −
                        </button>
                        <output aria-live="polite" className="readout flex h-11 min-w-[2.75rem] items-center justify-center border-y border-ink bg-white px-2 text-sm">
                          {line.quantity}
                        </output>
                        <button
                          type="button"
                          aria-label={`More: ${name}`}
                          disabled={atCeiling}
                          onClick={() => setQuantity(product.id, pack.id, line.quantity + 1)}
                          className={stepButton}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        aria-label={`Remove ${name}`}
                        onClick={() => {
                          removedLine.current = true;
                          remove(product.id, pack.id);
                        }}
                        className="inline-flex min-h-[44px] items-center px-2 text-sm underline"
                      >
                        Remove
                      </button>
                    </div>
                    {atCeiling && (
                      <p className="col-span-3 col-start-2 text-xs text-ink-muted">
                        {MAX_LINE_QUANTITY} is the most of one product an order can carry, across all its packs.
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {cart.lines.length > 0 && (
            <p className="readout mt-3 flex justify-between text-sm">
              <span className="text-ink-muted">
                {cart.itemCount} {cart.itemCount === 1 ? 'pack' : 'packs'} · {cart.unitCount} {cart.unitCount === 1 ? 'unit' : 'units'}
              </span>
              <span className="font-medium">Subtotal {formatPeso(cart.subtotal)}</span>
            </p>
          )}
        </>
      )}
    </section>
  );
}
