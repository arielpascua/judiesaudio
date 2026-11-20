import 'server-only';
import { randomUUID } from 'node:crypto';
import { serviceClient } from '@/lib/supabase/clients';
import { WriteTimeout, withTimeout } from './with-timeout';

export class InquiryUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InquiryUnavailableError';
  }
}

export interface InquiryInsert {
  reference: string;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  role: string;
  message: string;
  lines: Array<{
    productId: string;
    productName: string;
    packId: string;
    packLabel: string;
    /** Units in one pack (a snapshot, so a later catalogue edit cannot change what was asked). */
    units: number;
    quantity: number;
  }>;
}

const DEFAULT_TIMEOUT_MS = 3_000;
/** The orphan cleanup may run past the overall deadline, but never for longer than this. */
const CLEANUP_CAP_MS = 500;
const orNull = (v: string) => (v === '' ? null : v);

// Unlike an order, an inquiry has no payment redirect to protect: SUCCESS MEANS THE ROWS WERE SAVED.
// Anything else throws, so the caller answers 503 and the visitor is told honestly.
// NEVER LOG ROW DATA (R-IQ-9): only fixed tokens and the database error CODE are logged,
// never a database message, which can echo the row.
export async function recordInquiry(input: InquiryInsert, opts: { timeoutMs?: number } = {}): Promise<void> {
  const deadline = Date.now() + (opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const remaining = () => Math.max(0, deadline - Date.now());
  const db = serviceClient();
  if (!db) throw new InquiryUnavailableError('database is not configured for inquiries');
  const id = randomUUID();

  // A timed-out insert is only abandoned, not cancelled: the database may still commit it later, leaving a
  // header-only row with no items and no cleanup (orders.ts documents the same limit). The visitor is told
  // it failed, so a retry may create a second inquiry; a human can spot the empty header by its missing lines.
  try {
    const head = await withTimeout(
      db.from('ja_inquiries').insert({
        id,
        reference: input.reference,
        status: 'new',
        company: input.company,
        contact_name: input.contactName,
        email: input.email,
        phone: orNull(input.phone),
        role: orNull(input.role),
        message: orNull(input.message),
      }),
      remaining(),
    );
    if (head.error) {
      console.error('[inquiry] insert failed', { code: head.error.code ?? 'unknown' });
      throw new InquiryUnavailableError('inquiry insert failed');
    }
  } catch (error) {
    if (error instanceof InquiryUnavailableError) throw error;
    console.error(error instanceof WriteTimeout ? '[inquiry] insert timed out' : '[inquiry] insert threw');
    throw new InquiryUnavailableError('inquiry insert failed');
  }

  let failed = false;
  try {
    const items = await withTimeout(
      db.from('ja_inquiry_items').insert(
        input.lines.map((l) => ({
          inquiry_id: id,
          product_id: l.productId,
          product_name: l.productName,
          pack_id: l.packId,
          pack_label: l.packLabel,
          units: l.units,
          quantity: l.quantity,
        })),
      ),
      remaining(),
    );
    if (items.error) {
      console.error('[inquiry] items insert failed', { code: items.error.code ?? 'unknown' });
      failed = true;
    }
  } catch (error) {
    console.error(error instanceof WriteTimeout ? '[inquiry] items insert timed out' : '[inquiry] items insert threw');
    failed = true;
  }

  if (failed) {
    // A half-written inquiry (header without lines) must not survive: remove it, best effort.
    try {
      const cleanup = await withTimeout(db.from('ja_inquiries').delete().eq('id', id), CLEANUP_CAP_MS);
      // supabase-js reports a failed delete (a network failure included) as {error}, not a throw.
      // A surviving header row holds contact data, so say so (code only, never the message).
      if (cleanup.error) {
        console.error('[inquiry] cleanup of a half-written inquiry failed', { code: cleanup.error.code ?? 'unknown' });
      }
    } catch {
      console.error('[inquiry] cleanup of a half-written inquiry failed');
    }
    throw new InquiryUnavailableError('inquiry items insert failed');
  }
}
