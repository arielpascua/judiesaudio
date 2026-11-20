import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state: { db: unknown; throwOnClient: Error | null } = { db: null, throwOnClient: null };
vi.mock('@/lib/supabase/clients', () => ({
  serviceClient: () => {
    if (state.throwOnClient) throw state.throwOnClient;
    return state.db;
  },
}));

import { recordOrder, type OrderInput } from '@/lib/server/orders';

function fakeDb(
  opts: {
    orderError?: string;
    itemsError?: string;
    hangOn?: 'ja_orders' | 'ja_order_items';
    throwOn?: 'ja_order_items';
    deleteError?: string;
    /** ja_orders insert resolves successfully only after this many ms. */
    orderDelayMs?: number;
    hangDelete?: boolean;
  } = {},
) {
  const calls: { table: string; op: string; payload?: unknown; match?: unknown }[] = [];
  const db = {
    from: (table: string) => ({
      insert: async (payload: unknown) => {
        calls.push({ table, op: 'insert', payload });
        if (opts.hangOn === table) return new Promise<never>(() => {});
        if (table === 'ja_orders' && opts.orderDelayMs) {
          await new Promise((resolve) => setTimeout(resolve, opts.orderDelayMs));
        }
        if (opts.throwOn === table) throw new Error('socket hang up');
        const message = table === 'ja_orders' ? opts.orderError : opts.itemsError;
        return { error: message ? { message: `RAW ${message}`, code: 'XX000' } : null };
      },
      delete: () => ({
        eq: async (column: string, value: unknown) => {
          calls.push({ table, op: 'delete', match: { column, value } });
          if (opts.hangDelete) return new Promise<never>(() => {});
          return { error: opts.deleteError ? { message: `RAW ${opts.deleteError}`, code: 'XX001' } : null };
        },
      }),
    }),
  };
  return { calls, db };
}

const input: OrderInput = {
  reference: 'JA-ABCD12345678',
  totals: { subtotal: 76_800, shipping: 0, total: 76_800, itemCount: 2, isDomestic: true },
  paymentLink: 'https://sandbox.mymaya.me/SbxInv?amt=76800',
  customer: { company: 'Mabini Dining Corp.', contactName: 'Ana Reyes', email: 'ana@example.com', phone: '+639170000000', taxId: '000-000-000-000', poReference: 'PO-1042' },
  shippingAddress: { line1: '12 Mabini St', city: 'Quezon City', province: 'Metro Manila', postalCode: '1100', country: 'Philippines' },
  lines: [
    { productId: 'ja-fr-01', productName: 'Himig 6', packId: 'pair', packLabel: 'Matched pair', packUnits: 2, finishName: 'Matte Black', unitPrice: 38_400, quantity: 2 },
  ],
};

beforeEach(() => {
  state.db = null;
  state.throwOnClient = null;
});

describe('recordOrder ', () => {
  it('writes a PENDING order and snapshot item rows', async () => {
    const { db, calls } = fakeDb();
    state.db = db;
    await expect(recordOrder(input)).resolves.toEqual({ persisted: true });
    const order = calls.find((c) => c.table === 'ja_orders')!.payload as Record<string, unknown>;
    expect(order.status).toBe('pending');
    expect(order.reference).toBe('JA-ABCD12345678');
    expect(order.total).toBe(76_800);
    expect(order).not.toHaveProperty('range');
    // The whole B2B customer travels in the jsonb column.
    expect(order.customer).toEqual(input.customer);
    const items = calls.find((c) => c.table === 'ja_order_items')!.payload as Record<string, unknown>[];
    expect(items[0]).toMatchObject({
      product_id: 'ja-fr-01',
      product_name: 'Himig 6',
      pack_id: 'pair',
      pack_label: 'Matched pair',
      pack_units: 2,
      finish_name: 'Matte Black',
      unit_price: 38_400,
      quantity: 2,
    });
  });

  it('reports persisted:false without throwing when no service key is configured', async () => {
    await expect(recordOrder(input)).resolves.toMatchObject({ persisted: false });
  });

  it('reports persisted:false without throwing when the service client itself throws (half-set config)', async () => {
    const error = new Error('half-set Supabase configuration');
    error.name = 'SupabaseConfigError';
    state.throwOnClient = error;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(recordOrder(input)).resolves.toEqual({ persisted: false, reason: 'exception' });
    spy.mockRestore();
  });

  it('reports a fixed reason token, never the raw database message, when the order insert fails', async () => {
    state.db = fakeDb({ orderError: 'boom' }).db;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await recordOrder(input);
    expect(result).toEqual({ persisted: false, reason: 'order-insert-failed' });
    // The error CODE is logged for diagnosis; the message and details never are.
    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).toContain('XX000');
    expect(logged).not.toContain('RAW');
    spy.mockRestore();
  });

  it('removes the orphan order and reports persisted:false when the items insert fails', async () => {
    const { db, calls } = fakeDb({ itemsError: 'items boom' });
    state.db = db;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(recordOrder(input)).resolves.toEqual({ persisted: false, reason: 'items-insert-failed' });
    expect(calls.some((c) => c.table === 'ja_orders' && c.op === 'delete')).toBe(true);
    expect(JSON.stringify(spy.mock.calls)).not.toContain('RAW');
    spy.mockRestore();
  });

  it('deletes the SAME id it inserted into ja_orders when cleaning up the orphan', async () => {
    const { db, calls } = fakeDb({ itemsError: 'items boom' });
    state.db = db;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await recordOrder(input);
    const inserted = calls.find((c) => c.table === 'ja_orders' && c.op === 'insert')!.payload as { id: string };
    const deleted = calls.find((c) => c.table === 'ja_orders' && c.op === 'delete')!;
    expect(deleted.match).toEqual({ column: 'id', value: inserted.id });
    const itemRows = calls.find((c) => c.table === 'ja_order_items')!.payload as { order_id: string }[];
    expect(itemRows.every((r) => r.order_id === inserted.id)).toBe(true);
    spy.mockRestore();
  });

  it('logs (without PII) when the orphan cleanup itself fails', async () => {
    state.db = fakeDb({ itemsError: 'items boom', deleteError: 'delete boom' }).db;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(recordOrder(input)).resolves.toEqual({ persisted: false, reason: 'items-insert-failed' });
    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).toContain('orphan');
    expect(logged).toContain('XX001');
    expect(logged).not.toContain('RAW');
    expect(logged).not.toContain('ana@example.com');
    spy.mockRestore();
  });

  it('times out a hung order insert and reports persisted:false, reason timeout', async () => {
    state.db = fakeDb({ hangOn: 'ja_orders' }).db;
    await expect(recordOrder(input, { timeoutMs: 20 })).resolves.toEqual({
      persisted: false,
      reason: 'timeout',
    });
  });

  it('times out a hung items insert, still attempts to remove the order, reason timeout', async () => {
    const { db, calls } = fakeDb({ hangOn: 'ja_order_items' });
    state.db = db;
    await expect(recordOrder(input, { timeoutMs: 20 })).resolves.toEqual({
      persisted: false,
      reason: 'timeout',
    });
    expect(calls.some((c) => c.table === 'ja_orders' && c.op === 'delete')).toBe(true);
  });

  it('still removes the order when the items insert THROWS, reason exception', async () => {
    const { db, calls } = fakeDb({ throwOn: 'ja_order_items' });
    state.db = db;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(recordOrder(input)).resolves.toEqual({ persisted: false, reason: 'exception' });
    expect(calls.some((c) => c.table === 'ja_orders' && c.op === 'delete')).toBe(true);
    spy.mockRestore();
  });

  it('defaults to a 3 second overall deadline (not an unbounded wait)', async () => {
    vi.useFakeTimers();
    try {
      state.db = fakeDb({ hangOn: 'ja_orders' }).db;
      const pending = recordOrder(input);
      await vi.advanceTimersByTimeAsync(2_999);
      let settled = false;
      void pending.then(() => {
        settled = true;
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(2);
      await expect(pending).resolves.toEqual({ persisted: false, reason: 'timeout' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('shares ONE overall deadline across all steps: total time is timeoutMs + the cleanup cap, never 3x', async () => {
    vi.useFakeTimers();
    try {
      // Order insert takes 2s (inside the 3s budget), then the items insert and the cleanup both hang.
      const { db, calls } = fakeDb({ orderDelayMs: 2_000, hangOn: 'ja_order_items', hangDelete: true });
      state.db = db;
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const started = Date.now();
      const pending = recordOrder(input, { timeoutMs: 3_000 });
      let settledAt: number | null = null;
      void pending.then(() => {
        settledAt = Date.now() - started;
      });
      // The items insert only has the 1s that remains of the 3s deadline; the cleanup is capped at 500ms.
      await vi.advanceTimersByTimeAsync(3_000);
      expect(settledAt).toBeNull(); // cleanup still running
      await vi.advanceTimersByTimeAsync(500);
      await expect(pending).resolves.toEqual({ persisted: false, reason: 'timeout' });
      expect(settledAt).toBeLessThanOrEqual(3_500);
      expect(calls.some((c) => c.table === 'ja_orders' && c.op === 'delete')).toBe(true);
      spy.mockRestore();
    } finally {
      vi.useRealTimers();
    }
  });

  it('gives the items insert only the time left: a slow order insert leaves less for the lines', async () => {
    vi.useFakeTimers();
    try {
      const { db } = fakeDb({ orderDelayMs: 2_900, hangOn: 'ja_order_items' });
      state.db = db;
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const pending = recordOrder(input, { timeoutMs: 3_000 });
      let timedOut = false;
      void pending.then(() => {
        timedOut = true;
      });
      await vi.advanceTimersByTimeAsync(3_000); // 2.9s + the 100ms that remained
      await vi.advanceTimersByTimeAsync(0);
      await expect(pending).resolves.toMatchObject({ persisted: false, reason: 'timeout' });
      expect(timedOut).toBe(true);
      spy.mockRestore();
    } finally {
      vi.useRealTimers();
    }
  });

  it('never throws, even if the client throws', async () => {
    state.db = {
      from: () => {
        throw new Error('network down');
      },
    };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(recordOrder(input)).resolves.toMatchObject({ persisted: false });
    spy.mockRestore();
  });

  it("contains no code path that writes a 'paid' status", () => {
    const src = readFileSync(path.resolve(__dirname, 'orders.ts'), 'utf8');
    expect(src).not.toMatch(/['"]paid['"]/);
    expect(src).not.toMatch(/paid_at/);
  });
});
