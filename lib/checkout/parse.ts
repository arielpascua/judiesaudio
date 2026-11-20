import { isRestrictedCountry } from '@/lib/countries';
import { normalizePhone } from '@/lib/phone';
import { DELIVERABLE_COUNTRIES, DOMESTIC_COUNTRY, MAX_LINE_QUANTITY } from '@/lib/pricing';
import { FIELD_LIMITS as LIMITS } from './limits';
import type { OrderCustomer, ShippingAddress } from './types';

export class CheckoutError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'CheckoutError';
  }
}

export const MAX_LINES = 50;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface RequestedLine {
  productId: string;
  packId: string;
  quantity: number;
}

// Control characters (including tab, CR and LF: none of these fields is multi-line,
// and a CR/LF in a name or address is how header and log injection starts), DEL,
// and the Unicode bidi/format overrides that make text display as something it is
// not. Ordinary accented and non-Latin text is untouched.
// eslint-disable-next-line no-control-regex
const FORBIDDEN_CHARS = /[\u0000-\u001F\u007F\u200E\u200F\u202A-\u202E\u2066-\u2069\u061C\u0080-\u009F\u2028\u2029]/;

export function readString(value: unknown, field: string, max: number, required: boolean): string {
  if (value === null || value === undefined || value === '') {
    if (required) throw new CheckoutError(`${field} is required`, 400);
    return '';
  }
  if (typeof value !== 'string') throw new CheckoutError(`${field} must be text`, 400);
  // Checked on the RAW value, before trim(), so a trailing newline cannot be trimmed away unnoticed.
  if (FORBIDDEN_CHARS.test(value)) {
    throw new CheckoutError(`${field} contains characters that are not allowed`, 400);
  }
  const trimmed = value.trim();
  if (required && !trimmed) throw new CheckoutError(`${field} is required`, 400);
  if (trimmed.length > max) throw new CheckoutError(`${field} is too long`, 400);
  return trimmed;
}

/**
 * REJECTS RATHER THAN REPAIRS: a quantity of "3", 3.5 or -1 means caller and
 * server disagree about what is being bought. Lines are keyed by product AND
 * pack; the quantity ceiling is applied per PRODUCT across packs so it cannot be
 * evaded by splitting an order across packs. Any price in the body is never read.
 */
export function parseLines(body: unknown): RequestedLine[] {
  const items = (body as { items?: unknown }).items;
  if (!Array.isArray(items) || items.length === 0) {
    throw new CheckoutError('Select at least one item', 400);
  }
  if (items.length > MAX_LINES) {
    throw new CheckoutError(`An order may not contain more than ${MAX_LINES} lines`, 400);
  }

  const byKey = new Map<string, RequestedLine>();
  const perProduct = new Map<string, number>();

  for (const raw of items) {
    if (typeof raw !== 'object' || raw === null) {
      throw new CheckoutError('Each item must be an object', 400);
    }
    const { productId, packId, quantity } = raw as {
      productId?: unknown;
      packId?: unknown;
      quantity?: unknown;
    };

    if (typeof productId !== 'string' || productId.length === 0 || productId.length > LIMITS.id) {
      throw new CheckoutError('Each item requires a productId', 400);
    }
    if (typeof packId !== 'string' || packId.length === 0 || packId.length > LIMITS.id) {
      throw new CheckoutError('Each item requires a packId', 400);
    }
    if (typeof quantity !== 'number' || !Number.isInteger(quantity)) {
      throw new CheckoutError('Each item requires an integer quantity', 400);
    }
    if (quantity < 1 || quantity > MAX_LINE_QUANTITY) {
      throw new CheckoutError(`Quantity must be between 1 and ${MAX_LINE_QUANTITY}`, 400);
    }

    const productTotal = (perProduct.get(productId) ?? 0) + quantity;
    if (productTotal > MAX_LINE_QUANTITY) {
      throw new CheckoutError(
        `Total quantity for a single product may not exceed ${MAX_LINE_QUANTITY}`,
        400,
      );
    }
    perProduct.set(productId, productTotal);

    const key = `${productId}::${packId}`;
    const existing = byKey.get(key);
    if (existing) existing.quantity += quantity;
    else byKey.set(key, { productId, packId, quantity });
  }
  return [...byKey.values()];
}

export function parseCustomer(body: unknown): OrderCustomer {
  const raw = (body as { customer?: unknown }).customer;
  if (typeof raw !== 'object' || raw === null) {
    throw new CheckoutError('Customer details are required', 400);
  }
  const c = raw as Record<string, unknown>;
  const company = readString(c.company, 'Company', LIMITS.company, true);
  const contactName = readString(c.contactName, 'Contact name', LIMITS.name, true);
  const email = readString(c.email, 'Email', LIMITS.email, true);
  if (!EMAIL_RE.test(email)) throw new CheckoutError('That email address does not look right', 400);

  const phoneRaw = readString(c.phone, 'Phone', LIMITS.phone, false);
  let phone: string | undefined;
  if (phoneRaw) {
    const normalised = normalizePhone(phoneRaw);
    if (!normalised) throw new CheckoutError('That phone number does not look right', 400);
    phone = normalised;
  }

  return {
    company,
    contactName,
    email,
    phone,
    taxId: readString(c.taxId, 'Tax ID', LIMITS.taxId, false) || undefined,
    poReference: readString(c.poReference, 'PO reference', LIMITS.poReference, false) || undefined,
  };
}

export function parseAddress(body: unknown): ShippingAddress {
  const raw = (body as { shippingAddress?: unknown }).shippingAddress;
  if (typeof raw !== 'object' || raw === null) {
    throw new CheckoutError('A shipping address is required', 400);
  }
  const a = raw as Record<string, unknown>;
  const country = readString(a.country, 'Country', LIMITS.country, true);

  // The country is a PRICING INPUT (domestic or not), so it is an allowlist.
  // "Not recognised" and "we cannot ship there" are different conversations.
  if (!DELIVERABLE_COUNTRIES.includes(country)) {
    if (isRestrictedCountry(country)) {
      throw new CheckoutError(
        `We are not able to ship to ${country} under current trade restrictions`,
        400,
      );
    }
    throw new CheckoutError(`"${country}" is not a country we recognise`, 400);
  }

  return {
    line1: readString(a.line1, 'Street address', LIMITS.line, true),
    line2: readString(a.line2, 'Address line 2', LIMITS.line, false) || undefined,
    barangay: readString(a.barangay, 'Barangay', LIMITS.barangay, false) || undefined,
    city: readString(a.city, 'City or municipality', LIMITS.city, true),
    province:
      country === DOMESTIC_COUNTRY
        ? readString(a.province, 'Province', LIMITS.province, true)
        : readString(a.province, 'State or region', LIMITS.province, false),
    postalCode: readString(a.postalCode, 'Postal code', LIMITS.postal, true),
    country,
  };
}
