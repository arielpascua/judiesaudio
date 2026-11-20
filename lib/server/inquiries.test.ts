import { inspect } from 'node:util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state: { db: unknown; throwOnClient: Error | null } = { db: null, throwOnClient: null };
vi.mock('@/lib/supabase/clients', () => ({
  serviceClient: () => {
    if (state.throwOnClient) throw state.throwOnClient;
    return state.db;
  },
}));

import { InquiryUnavailableError, recordInquiry, type InquiryInsert } from '@/lib/server/inquiries';

function fakeDb(
  opts: {
    inquiryError?: boolean;
    itemsError?: boolean;
    hangOn?: 'ja_inquiries' | 'ja_inquiry_items';
    throwOn?: 'ja_inquiries' | 'ja_inquiry_items';
    hangDelete?: boolean;
    deleteThrows?: boolean;
    deleteError?: boolean;
  } = {},
) {
  const calls: { table: string; op: string; payload?: unknown; match?: unknown }[] = [];
  const db = {
    from: (table: string) => ({
      insert: async (payload: unknown) => {
        calls.push({ table, op: 'insert', payload });
        if (opts.hangOn === table) return new Promise<never>(() => {});
        if (opts.throwOn === table) throw new Error('socket hang up for Reyes Interiors');
        const failed = table === 'ja_inquiries' ? opts.inquiryError : opts.itemsError;
        // The raw message deliberately echoes row data, as a real database error can.
        return { error: failed ? { message: 'RAW duplicate key ana@reyesinteriors.example', code: 'XX000' } : null };
      },
      delete: () => ({
        eq: async (column: string, value: unknown) => {
          calls.push({ table, op: 'delete', match: { column, value } });
          if (opts.hangDelete) return new Promise<never>(() => {});
          if (opts.deleteThrows) throw new Error('cleanup blew up for Ana Reyes');
          // supabase-js reports a failed delete (network failure included) as {error}, not a throw.
          return { error: opts.deleteError ? { message: 'RAW delete failed for ana@reyesinteriors.example', code: 'XX001' } : null };
        },
      }),
    }),
  };
  return { calls, db };
}

const input: InquiryInsert = {
  reference: 'JAI-0123456789AB',
  company: 'Reyes Interiors',
  contactName: 'Ana Reyes',
  email: 'ana@reyesinteriors.example',
  phone: '+63 917 555 0100',
  role: 'Operations manager',
  message: 'Ceiling speakers for a hotel lobby.',
  lines: [
    { productId: 'ja-ce-01', productName: 'Langit 6C', packId: 'pack-10', packLabel: 'Carton of 10', units: 10, quantity: 4 },
    { productId: 'ja-ou-01', productName: 'Ulan 5W', packId: 'pair', packLabel: 'Matched pair', units: 2, quantity: 1 },
  ],
};

const SENSITIVE = [
  'Reyes Interiors', 'Ana Reyes', 'ana@reyesinteriors.example', '+63 917 555 0100', 'Operations manager', 'hotel lobby',
];

let errorSpy: ReturnType<typeof vi.spyOn>;
let infoSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  state.db = null;
  state.throwOnClient = null;
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function everythingLogged(): string {
  return [errorSpy, infoSpy, warnSpy].flatMap((s) => s.mock.calls.map((c) => inspect(c, { depth: 6 }))).join('\n');
}

function expectNoRowDataLogged() {
  const logged = everythingLogged();
  for (const secret of SENSITIVE) expect(logged).not.toContain(secret);
  expect(logged).not.toContain('RAW');
  expect(logged).not.toContain('socket hang up');
}

describe('recordInquiry (R-IQ-4, R-IQ-9): success means the rows were saved', () => {
  it('writes the exact inquiry and snapshot item rows', async () => {
    const { db, calls } = fakeDb();
    state.db = db;
    await expect(recordInquiry(input)).resolves.toBeUndefined();

    const head = calls.find((c) => c.table === 'ja_inquiries' && c.op === 'insert')!.payload as Record<string, unknown>;
    expect(head).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      reference: 'JAI-0123456789AB',
      status: 'new',
      company: 'Reyes Interiors',
      contact_name: 'Ana Reyes',
      email: 'ana@reyesinteriors.example',
      phone: '+63 917 555 0100',
      role: 'Operations manager',
      message: 'Ceiling speakers for a hotel lobby.',
    });

    const items = calls.find((c) => c.table === 'ja_inquiry_items')!.payload as Record<string, unknown>[];
    expect(items).toEqual([
      {
        inquiry_id: head.id, product_id: 'ja-ce-01', product_name: 'Langit 6C',
        pack_id: 'pack-10', pack_label: 'Carton of 10', units: 10, quantity: 4,
      },
      {
        inquiry_id: head.id, product_id: 'ja-ou-01', product_name: 'Ulan 5W',
        pack_id: 'pair', pack_label: 'Matched pair', units: 2, quantity: 1,
      },
    ]);
    expect(calls.some((c) => c.op === 'delete')).toBe(false);
    expect(JSON.stringify(calls)).not.toContain('price');
  });

  it('stores empty phone, role and message as null', async () => {
    const { db, calls } = fakeDb();
    state.db = db;
    await recordInquiry({ ...input, phone: '', role: '', message: '' });
    const head = calls.find((c) => c.table === 'ja_inquiries')!.payload as Record<string, unknown>;
    expect(head.phone).toBeNull();
    expect(head.role).toBeNull();
    expect(head.message).toBeNull();
  });

  it('logs nothing on success', async () => {
    const { db } = fakeDb();
    state.db = db;
    await recordInquiry(input);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe('recordInquiry: failure is never reported as success (Review Focus 2)', () => {
  it('rejects when no service client is configured', async () => {
    state.db = null;
    await expect(recordInquiry(input)).rejects.toBeInstanceOf(InquiryUnavailableError);
  });

  it('lets a configuration error from serviceClient() propagate (it is mapped to 503 by the route)', async () => {
    state.throwOnClient = Object.assign(new Error('half-set'), { name: 'SupabaseConfigError' });
    await expect(recordInquiry(input)).rejects.toMatchObject({ name: 'SupabaseConfigError' });
  });

  it('rejects when the inquiry insert returns an error, and writes no items', async () => {
    const { db, calls } = fakeDb({ inquiryError: true });
    state.db = db;
    await expect(recordInquiry(input)).rejects.toBeInstanceOf(InquiryUnavailableError);
    expect(calls.some((c) => c.table === 'ja_inquiry_items')).toBe(false);
    expectNoRowDataLogged();
  });

  it('rejects when the inquiry insert throws', async () => {
    const { db } = fakeDb({ throwOn: 'ja_inquiries' });
    state.db = db;
    await expect(recordInquiry(input)).rejects.toBeInstanceOf(InquiryUnavailableError);
    expectNoRowDataLogged();
  });

  it('rejects when the items insert returns an error, and deletes the inquiry row by id', async () => {
    const { db, calls } = fakeDb({ itemsError: true });
    state.db = db;
    await expect(recordInquiry(input)).rejects.toBeInstanceOf(InquiryUnavailableError);
    const head = calls.find((c) => c.table === 'ja_inquiries' && c.op === 'insert')!.payload as { id: string };
    const del = calls.find((c) => c.op === 'delete')!;
    expect(del.table).toBe('ja_inquiries');
    expect(del.match).toEqual({ column: 'id', value: head.id });
    expectNoRowDataLogged();
  });

  it('rejects when the items insert throws, and cleans up', async () => {
    const { db, calls } = fakeDb({ throwOn: 'ja_inquiry_items' });
    state.db = db;
    await expect(recordInquiry(input)).rejects.toBeInstanceOf(InquiryUnavailableError);
    expect(calls.some((c) => c.op === 'delete' && c.table === 'ja_inquiries')).toBe(true);
    expectNoRowDataLogged();
  });

  it('rejects on a hung inquiry insert once the deadline passes, logging a timeout', async () => {
    const { db } = fakeDb({ hangOn: 'ja_inquiries' });
    state.db = db;
    await expect(recordInquiry(input, { timeoutMs: 20 })).rejects.toBeInstanceOf(InquiryUnavailableError);
    expect(inspect(errorSpy.mock.calls)).toContain('timed out');
    expectNoRowDataLogged();
  });

  it('rejects on a hung items insert and still attempts the cleanup', async () => {
    const { db, calls } = fakeDb({ hangOn: 'ja_inquiry_items' });
    state.db = db;
    await expect(recordInquiry(input, { timeoutMs: 20 })).rejects.toBeInstanceOf(InquiryUnavailableError);
    expect(calls.some((c) => c.op === 'delete' && c.table === 'ja_inquiries')).toBe(true);
    expect(inspect(errorSpy.mock.calls)).toContain('timed out');
    expectNoRowDataLogged();
  });

  it('still rejects (and does not hang) when the cleanup itself hangs', async () => {
    const { db } = fakeDb({ itemsError: true, hangDelete: true });
    state.db = db;
    const started = Date.now();
    await expect(recordInquiry(input, { timeoutMs: 20 })).rejects.toBeInstanceOf(InquiryUnavailableError);
    expect(Date.now() - started).toBeLessThan(2_000);
    expect(inspect(errorSpy.mock.calls)).toContain('cleanup');
    expectNoRowDataLogged();
  });

  it('still rejects with the generic error when the cleanup throws', async () => {
    const { db } = fakeDb({ itemsError: true, deleteThrows: true });
    state.db = db;
    await expect(recordInquiry(input)).rejects.toBeInstanceOf(InquiryUnavailableError);
    expectNoRowDataLogged();
  });

  it('logs the code, not the message, when the cleanup delete RESOLVES with an error, and still rejects', async () => {
    const { db, calls } = fakeDb({ itemsError: true, deleteError: true });
    state.db = db;
    await expect(recordInquiry(input)).rejects.toBeInstanceOf(InquiryUnavailableError);
    expect(calls.some((c) => c.op === 'delete')).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith('[inquiry] cleanup of a half-written inquiry failed', { code: 'XX001' });
    expectNoRowDataLogged();
  });

  it('logs nothing about cleanup when the delete succeeds', async () => {
    const { db } = fakeDb({ itemsError: true });
    state.db = db;
    await expect(recordInquiry(input)).rejects.toBeInstanceOf(InquiryUnavailableError);
    expect(inspect(errorSpy.mock.calls)).not.toContain('cleanup');
  });

  it('keeps row data out of the error message too', async () => {
    const { db } = fakeDb({ inquiryError: true });
    state.db = db;
    const error = (await recordInquiry(input).catch((e: unknown) => e)) as Error;
    for (const secret of SENSITIVE) expect(error.message).not.toContain(secret);
  });
});
