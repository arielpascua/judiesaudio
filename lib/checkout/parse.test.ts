import { describe, expect, it } from 'vitest';
import { FIELD_LIMITS } from '@/lib/checkout/limits';
import { CheckoutError, parseAddress, parseCustomer, parseLines, readString } from '@/lib/checkout/parse';

const CUSTOMER = { company: 'Mabini Dining Corp.', contactName: 'Ana Reyes', email: 'ana@example.com' };

function rejects(value: unknown, field = 'Street address') {
  try {
    readString(value, field, 160, true);
  } catch (error) {
    expect(error).toBeInstanceOf(CheckoutError);
    expect((error as CheckoutError).status).toBe(400);
    expect((error as CheckoutError).message).toContain(field);
    return;
  }
  throw new Error(`expected readString to reject ${JSON.stringify(value)}`);
}

describe('D4: the parser enforces the shared FIELD_LIMITS', () => {
  const address = (over: Record<string, string>) => ({
    shippingAddress: { line1: '12 Mabini St', city: 'Quezon City', province: 'Metro Manila', postalCode: '1100', country: 'Philippines', ...over },
  });

  it.each([
    ['line1', FIELD_LIMITS.line, /Street address is too long/],
    ['city', FIELD_LIMITS.city, /City or municipality is too long/],
    ['province', FIELD_LIMITS.province, /Province is too long/],
    ['postalCode', FIELD_LIMITS.postal, /Postal code is too long/],
  ])('%s: exactly the limit passes, one more is rejected', (field, max, message) => {
    expect(() => parseAddress(address({ [field]: 'x'.repeat(max) }))).not.toThrow();
    expect(() => parseAddress(address({ [field]: 'x'.repeat(max + 1) }))).toThrow(message);
  });

  it('company, contact name, email, phone, tax id and PO reference use their limits', () => {
    const customer = (over: Record<string, string>) => ({ customer: { ...CUSTOMER, ...over } });
    expect(() => parseCustomer(customer({ company: 'x'.repeat(FIELD_LIMITS.company) }))).not.toThrow();
    expect(() => parseCustomer(customer({ company: 'x'.repeat(FIELD_LIMITS.company + 1) }))).toThrow(/Company is too long/);
    expect(() => parseCustomer(customer({ contactName: 'x'.repeat(FIELD_LIMITS.name + 1) }))).toThrow(/Contact name is too long/);
    expect(() => parseCustomer(customer({ taxId: 'x'.repeat(FIELD_LIMITS.taxId + 1) }))).toThrow(/Tax ID is too long/);
    expect(() => parseCustomer(customer({ poReference: 'x'.repeat(FIELD_LIMITS.poReference + 1) }))).toThrow(/PO reference is too long/);
    expect(() => parseCustomer(customer({ phone: '1'.repeat(FIELD_LIMITS.phone + 1) }))).toThrow(/Phone is too long/);
    const longEmail = `${'a'.repeat(FIELD_LIMITS.email)}@example.com`;
    expect(() => parseCustomer(customer({ email: longEmail }))).toThrow(/Email is too long/);
  });
});

describe('parseCustomer (B2B)', () => {
  it('requires company, contact name and email, and accepts the optional fields blank', () => {
    expect(parseCustomer({ customer: CUSTOMER })).toEqual({
      ...CUSTOMER, phone: undefined, taxId: undefined, poReference: undefined,
    });
    expect(() => parseCustomer({ customer: { ...CUSTOMER, company: '  ' } })).toThrow(/Company is required/);
    expect(() => parseCustomer({ customer: { ...CUSTOMER, contactName: '' } })).toThrow(/Contact name is required/);
    expect(() => parseCustomer({ customer: { ...CUSTOMER, email: undefined } })).toThrow(/Email is required/);
    expect(() => parseCustomer({})).toThrow(/Customer details are required/);
  });

  it('keeps TIN and PO reference, and normalises a valid phone', () => {
    const c = parseCustomer({ customer: { ...CUSTOMER, phone: '+63 917 000 0000', taxId: '000-000-000-000', poReference: 'PO-1042' } });
    expect(c).toMatchObject({ phone: '+639170000000', taxId: '000-000-000-000', poReference: 'PO-1042' });
  });

  it('rejects a phone that is not a number, and a malformed email, with status 400', () => {
    expect(() => parseCustomer({ customer: { ...CUSTOMER, phone: 'call me' } })).toThrow(/phone number does not look right/);
    expect(() => parseCustomer({ customer: { ...CUSTOMER, email: 'nope' } })).toThrow(/does not look right/);
  });

  it('rejects control characters in the new fields', () => {
    expect(() => parseCustomer({ customer: { ...CUSTOMER, poReference: 'PO\n1' } })).toThrow(/PO reference/);
    expect(() => parseCustomer({ customer: { ...CUSTOMER, taxId: 'x‮y' } })).toThrow(/Tax ID/);
  });
});

describe('parseLines', () => {
  const line = (productId: string, packId: string, quantity: number) => ({ productId, packId, quantity });

  it('merges a repeated product+pack and keeps different packs as separate lines', () => {
    expect(parseLines({ items: [line('a', 'single', 1), line('a', 'single', 2), line('a', 'pair', 1)] })).toEqual([
      line('a', 'single', 3),
      line('a', 'pair', 1),
    ]);
  });

  it('applies the quantity ceiling per PRODUCT across packs', () => {
    expect(() => parseLines({ items: [line('a', 'single', 15), line('a', 'pair', 15)] })).toThrow(/may not exceed 20/);
    expect(() => parseLines({ items: [line('a', 'single', 10), line('b', 'single', 15)] })).not.toThrow();
  });

  it('rejects a missing packId, a sizeId-shaped item and a non-integer quantity', () => {
    expect(() => parseLines({ items: [{ productId: 'a', sizeId: 'single', quantity: 1 }] })).toThrow(/packId/);
    expect(() => parseLines({ items: [line('a', 'single', 1.5)] })).toThrow(/integer quantity/);
    expect(() => parseLines({ items: [{ productId: 'a', packId: 'single', quantity: '2' }] })).toThrow(/integer quantity/);
    expect(() => parseLines({ items: [] })).toThrow(/at least one item/);
  });

  it('never carries a price through', () => {
    const [out] = parseLines({ items: [{ productId: 'a', packId: 'single', quantity: 1, price: 1, unitPrice: 1 }] });
    expect(Object.keys(out).sort()).toEqual(['packId', 'productId', 'quantity']);
  });
});

describe('readString control and format characters (F9)', () => {
  const asciiControls = Array.from({ length: 0x20 }, (_, i) => String.fromCharCode(i));

  it.each(asciiControls.map((c) => [`U+${c.charCodeAt(0).toString(16).padStart(4, '0')}`, c]))(
    'rejects ASCII control %s anywhere in the value, with the field named',
    (_label, ch) => {
      rejects(`12 Mabini${ch}St`);
      rejects(`${ch}12 Mabini St`);
      rejects(`12 Mabini St${ch}`); // a trailing one must not be hidden by trim()
    },
  );

  it('rejects DEL (U+007F)', () => {
    rejects('12 Mabini\u007fSt');
  });

  it.each([
    ['U+202A LRE', '\u202A'],
    ['U+202B RLE', '\u202B'],
    ['U+202C PDF', '\u202C'],
    ['U+202D LRO', '\u202D'],
    ['U+202E RLO', '\u202E'],
    ['U+2066 LRI', '\u2066'],
    ['U+2067 RLI', '\u2067'],
    ['U+2068 FSI', '\u2068'],
    ['U+2069 PDI', '\u2069'],
    ['U+200E LRM', '\u200E'],
    ['U+200F RLM', '\u200F'],
  ])('rejects bidi/format override %s', (_label, ch) => {
    rejects(`Reyes${ch}Ana`, 'Contact name');
  });

  it('applies to optional fields too, and the message names the field', () => {
    expect(() => readString('line\n2', 'Address line 2', 160, false)).toThrow(/Address line 2/);
  });

  it('still accepts ordinary accented and non-Latin text', () => {
    expect(readString('Doña Ñandú Peña', 'Name', 80, true)).toBe('Doña Ñandú Peña');
    expect(readString('Ñ', 'Name', 80, true)).toBe('Ñ');
    expect(readString('Zoë Müller-Łukasiewicz', 'Name', 80, true)).toBe('Zoë Müller-Łukasiewicz');
    expect(readString('東京都 渋谷区', 'City', 80, true)).toBe('東京都 渋谷区');
    expect(readString('  padded with spaces  ', 'Name', 80, true)).toBe('padded with spaces');
  });

  it('still treats empty and missing optional values as empty', () => {
    expect(readString('', 'Barangay', 120, false)).toBe('');
    expect(readString(undefined, 'Barangay', 120, false)).toBe('');
  });

  it('is enforced through parseCustomer and parseAddress', () => {
    expect(() =>
      parseCustomer({ customer: { ...CUSTOMER, contactName: 'Ana\u202E' } }),
    ).toThrow(/Contact name/);
    expect(() =>
      parseAddress({
        shippingAddress: {
          line1: '12 Mabini St\r\nBcc: x',
          city: 'Quezon City',
          province: 'Metro Manila',
          postalCode: '1100',
          country: 'Philippines',
        },
      }),
    ).toThrow(/Street address/);
  });
});
