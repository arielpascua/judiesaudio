import { CheckoutError, readString } from '@/lib/checkout/parse';
import { PACK_IDS, type PackId } from '@/lib/catalog/types';
import { INQUIRY_LIMITS as L, type InquiryLineInput } from './types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Like readString's set, but a message may be multi-line: tab, LF and CR are allowed here only.
// eslint-disable-next-line no-control-regex
const FORBIDDEN_IN_MESSAGE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200E\u200F\u202A-\u202E\u2066-\u2069\u061C\u0080-\u009F\u2028\u2029]/;

// readString (shared with checkout, deliberately unchanged) lets a few invisible characters through:
// the Arabic letter mark, the C1 controls (incl. NEL) and the line/paragraph separators. They are
// refused here, on the RAW value: several of them count as whitespace, so trim() would hide them.
// eslint-disable-next-line no-control-regex
const EXTRA_FORBIDDEN = /[\u061C\u0080-\u009F\u2028\u2029]/;

function readField(value: unknown, field: string, max: number, required: boolean): string {
  if (typeof value === 'string' && EXTRA_FORBIDDEN.test(value)) {
    throw new CheckoutError(`${field} contains characters that are not allowed`, 400);
  }
  return readString(value, field, max, required);
}

export interface ParsedInquiry {
  company: string;
  contactName: string;
  email: string;
  phone: string;
  role: string;
  message: string;
  lines: InquiryLineInput[];
}

function readMessage(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') throw new CheckoutError('Message must be text', 400);
  if (FORBIDDEN_IN_MESSAGE.test(value)) throw new CheckoutError('Message contains characters that are not allowed', 400);
  const trimmed = value.trim();
  if (trimmed.length > L.message) throw new CheckoutError('Message is too long', 400);
  return trimmed;
}

function parseLines(raw: unknown): InquiryLineInput[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new CheckoutError('Choose at least one model', 400);
  if (raw.length > L.maxLines) throw new CheckoutError(`An inquiry may not list more than ${L.maxLines} models`, 400);
  const seen = new Set<string>();
  return raw.map((entry) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new CheckoutError('Each model must be an object', 400);
    }
    const e = entry as Record<string, unknown>;
    const productId = readField(e.productId, 'Model', L.id, true);
    const packId = readField(e.packId, 'Pack', L.id, true);
    if (!(PACK_IDS as readonly string[]).includes(packId)) throw new CheckoutError('Choose a pack from the list', 400);
    const quantity = e.quantity;
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > L.maxQuantity) {
      throw new CheckoutError(`Quantity must be a whole number from 1 to ${L.maxQuantity}`, 400);
    }
    const key = `${productId}\u0000${packId}`;
    if (seen.has(key)) throw new CheckoutError('A model and pack may not be listed more than once', 400);
    seen.add(key);
    // Rebuilt from the three known fields: nothing else the caller sent (a price, say) is carried through.
    return { productId, packId: packId as PackId, quantity };
  });
}

export function parseInquiry(body: unknown): ParsedInquiry {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new CheckoutError('Request body must be a JSON object', 400);
  }
  const b = body as Record<string, unknown>;
  // Honeypot: a real visitor never sees this field. Generic message on purpose.
  if (typeof b.website === 'string' ? b.website.trim() !== '' : b.website !== undefined && b.website !== null && b.website !== '') {
    throw new CheckoutError('Invalid request', 400);
  }
  const email = readField(b.email, 'Email', L.email, true);
  if (!EMAIL_RE.test(email)) throw new CheckoutError('That email address does not look right', 400);
  return {
    company: readField(b.company, 'Company', L.company, true),
    contactName: readField(b.contactName, 'Contact name', L.name, true),
    email,
    phone: readField(b.phone, 'Phone', L.phone, false),
    role: readField(b.role, 'Role', L.role, false),
    message: readMessage(b.message),
    lines: parseLines(b.items),
  };
}
