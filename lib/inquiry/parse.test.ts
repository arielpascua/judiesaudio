import { describe, expect, it } from 'vitest';
import { CheckoutError } from '@/lib/checkout/parse';
import { parseInquiry } from '@/lib/inquiry/parse';

function valid(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    company: 'Reyes Interiors',
    contactName: 'Ana Reyes',
    email: 'ana@reyesinteriors.example',
    items: [{ productId: 'ja-fr-02', packId: 'pair', quantity: 2 }],
    ...over,
  };
}

function reject(body: unknown, fragment: string | RegExp) {
  let caught: unknown;
  try {
    parseInquiry(body);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(CheckoutError);
  expect((caught as CheckoutError).status).toBe(400);
  expect((caught as CheckoutError).message).toMatch(fragment);
}

describe('parseInquiry: happy path', () => {
  it('trims strings and defaults optional fields to empty strings', () => {
    const r = parseInquiry(valid({ company: '  Casa Verde  ', contactName: ' Ana ', email: ' ana@x.example ' }));
    expect(r).toEqual({
      company: 'Casa Verde',
      contactName: 'Ana',
      email: 'ana@x.example',
      phone: '',
      role: '',
      message: '',
      lines: [{ productId: 'ja-fr-02', packId: 'pair', quantity: 2 }],
    });
  });

  it('keeps optional fields when given', () => {
    const r = parseInquiry(valid({ phone: ' +63 917 000 0000 ', role: 'Operations manager', message: 'Hello' }));
    expect(r).toMatchObject({ phone: '+63 917 000 0000', role: 'Operations manager', message: 'Hello' });
  });
});

describe('parseInquiry: body shape', () => {
  it.each([[null], [[]], ['text'], [7], [undefined]])('rejects a non-object body %j', (body) => {
    reject(body, /JSON object/);
  });
});

describe('parseInquiry: required fields (R-IQ-5)', () => {
  it('requires a company', () => reject(valid({ company: undefined }), /Company is required/));
  it('requires a contact name', () => reject(valid({ contactName: '' }), /Contact name is required/));
  it('requires an email', () => reject(valid({ email: undefined }), /Email is required/));
  it('rejects a malformed email', () => reject(valid({ email: 'a@b' }), /does not look right/));
  it('rejects an email with a newline', () =>
    reject(valid({ email: 'a@b.example\nBcc: x@y.example' }), /not allowed/));
});

describe('parseInquiry: single-line fields (Review Focus 3)', () => {
  it('rejects a newline in the company', () => reject(valid({ company: 'Casa\nVerde' }), /not allowed/));
  it('rejects a bidi override in the company', () => reject(valid({ company: 'Casa\u202EVerde' }), /not allowed/));
  it('rejects a 121 character company', () => reject(valid({ company: 'a'.repeat(121) }), /too long/));
  it('accepts a 120 character company', () => {
    expect(parseInquiry(valid({ company: 'a'.repeat(120) })).company).toHaveLength(120);
  });
  it('rejects a 41 character phone', () => reject(valid({ phone: '1'.repeat(41) }), /too long/));
  it('rejects a newline in the role', () => reject(valid({ role: 'Ope\nrations' }), /not allowed/));
});

describe('parseInquiry: message may be multi-line', () => {
  it('rejects 2001 characters', () => reject(valid({ message: 'a'.repeat(2001) }), /too long/));
  it('accepts 2000 characters with newlines and preserves them', () => {
    const message = `${'line\n'.repeat(399)}${'a'.repeat(2000 - 399 * 5)}`;
    expect(message).toHaveLength(2000);
    expect(parseInquiry(valid({ message })).message).toBe(message);
  });
  it('preserves tabs, LF and CR inside the text', () => {
    expect(parseInquiry(valid({ message: 'a\tb\r\nc' })).message).toBe('a\tb\r\nc');
  });
  it('rejects a NUL', () => reject(valid({ message: 'a\u0000b' }), /not allowed/));
  it('rejects a bidi override', () => reject(valid({ message: 'a\u202Eb' }), /not allowed/));
  it('rejects a non-text message', () => reject(valid({ message: 5 }), /must be text/));
});

describe('parseInquiry: items', () => {
  it('requires items', () => reject(valid({ items: undefined }), /at least one model/));
  it('rejects an empty list', () => reject(valid({ items: [] }), /at least one model/));
  it('rejects 21 entries', () => {
    const items = Array.from({ length: 21 }, (_, i) => ({ productId: `p${i}`, packId: 'pair', quantity: 1 }));
    reject(valid({ items }), /more than 20/);
  });
  it('accepts 20 entries', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ productId: `p${i}`, packId: 'pair', quantity: 1 }));
    expect(parseInquiry(valid({ items })).lines).toHaveLength(20);
  });
  it.each([[5], ['x'], [null], [[]]])('rejects an entry that is not an object %j', (entry) => {
    reject(valid({ items: [entry] }), /must be an object/);
  });
  it('rejects an empty productId', () =>
    reject(valid({ items: [{ productId: '', packId: 'pair', quantity: 1 }] }), /Model is required/));
  it('rejects a 65 character productId', () =>
    reject(valid({ items: [{ productId: 'a'.repeat(65), packId: 'pair', quantity: 1 }] }), /too long/));
  it('rejects a missing packId', () =>
    reject(valid({ items: [{ productId: 'ja-fr-02', quantity: 1 }] }), /Pack is required/));

  it.each([['3'], [3.5], [0], [-1], [1001], [NaN], [null], [undefined]])('rejects quantity %j', (quantity) => {
    reject(valid({ items: [{ productId: 'ja-fr-02', packId: 'pair', quantity }] }), /whole number from 1 to 1000/);
  });
  it.each([[1], [1000]])('accepts boundary quantity %j', (quantity) => {
    const result = parseInquiry(valid({ items: [{ productId: 'ja-fr-02', packId: 'pair', quantity }] }));
    expect(result.lines[0].quantity).toBe(quantity);
  });

  it('rejects the same model and pack twice', () => {
    const line = { productId: 'ja-fr-02', packId: 'pair', quantity: 1 };
    reject(valid({ items: [line, { ...line, quantity: 2 }] }), /listed more than once/);
  });
  it.each([['gross'], ['constructor'], ['__proto__'], ['Single'], ['PACK-4']])('rejects the pack %j: only the four known pack ids pass', (packId) => {
    reject(valid({ items: [{ productId: 'ja-fr-02', packId, quantity: 1 }] }), /Choose a pack from the list|not allowed/);
  });
  it.each([['single'], ['pair'], ['pack-4'], ['pack-10']])('accepts the pack %j', (packId) => {
    expect(parseInquiry(valid({ items: [{ productId: 'ja-fr-02', packId, quantity: 1 }] })).lines[0].packId).toBe(packId);
  });
  it('allows the same model in two packs', () => {
    const items = [
      { productId: 'ja-fr-02', packId: 'pair', quantity: 1 },
      { productId: 'ja-fr-02', packId: 'single', quantity: 1 },
    ];
    expect(parseInquiry(valid({ items })).lines).toHaveLength(2);
  });
});

describe('parseInquiry: honeypot', () => {
  it('rejects a filled website field with a generic message', () => {
    reject(valid({ website: 'x' }), /^Invalid request$/);
  });
  it('rejects a non-string website value too', () => reject(valid({ website: 1 }), /^Invalid request$/));
  it('accepts an empty or absent honeypot', () => {
    expect(() => parseInquiry(valid({ website: '' }))).not.toThrow();
    expect(() => parseInquiry(valid({ website: '   ' }))).not.toThrow();
    expect(() => parseInquiry(valid({ website: null }))).not.toThrow();
  });
  it('never mentions the honeypot in the error', () => {
    expect.assertions(1);
    try {
      parseInquiry(valid({ website: 'x' }));
    } catch (error) {
      expect((error as Error).message).not.toMatch(/website|honeypot|bot|spam/i);
    }
  });
});

describe('parseInquiry: prices are never read (R-B2B-1)', () => {
  it('ignores price fields and returns none', () => {
    const body = valid({ price: 1, items: [{ productId: 'ja-fr-02', packId: 'pair', quantity: 1, price: 1 }] });
    const result = parseInquiry(body);
    expect(JSON.stringify(result)).not.toContain('price');
  });
});

// Invisible characters that readString (shared with checkout, unchanged) lets through:
// U+061C Arabic letter mark, C1 controls U+0080-U+009F (incl. NEL), U+2028/U+2029.
const EXTRA_FORBIDDEN: Array<[string, string]> = [
  ['Arabic letter mark U+061C', 'a\u061Cb'],
  ['C1 control U+0080', 'a\u0080b'],
  ['NEL U+0085', 'a\u0085b'],
  ['C1 control U+009F', 'a\u009Fb'],
  ['line separator U+2028', 'a\u2028b'],
  ['paragraph separator U+2029', 'a\u2029b'],
];

describe('parseInquiry: extra invisible characters (R-IQ-5)', () => {
  const singleLine: Array<[string, string, RegExp]> = [
    ['company', 'company', /Company contains characters that are not allowed/],
    ['contact name', 'contactName', /Contact name contains characters that are not allowed/],
    ['phone', 'phone', /Phone contains characters that are not allowed/],
    ['role', 'role', /Role contains characters that are not allowed/],
  ];
  for (const [label, sample] of EXTRA_FORBIDDEN) {
    for (const [field, key, message] of singleLine) {
      it(`rejects ${label} in ${field}`, () => reject(valid({ [key]: sample }), message));
    }
    it(`rejects ${label} in email`, () =>
      reject(valid({ email: `a${sample.slice(1, 2)}@b.example` }), /Email contains characters that are not allowed/));
    it(`rejects ${label} in message`, () => reject(valid({ message: sample }), /Message contains characters that are not allowed/));
    it(`rejects ${label} in a productId`, () =>
      reject(valid({ items: [{ productId: sample, packId: 'pair', quantity: 1 }] }), /Model contains characters that are not allowed/));
  }

  it('still accepts ordinary accented and non-Latin text', () => {
    const r = parseInquiry(
      valid({ company: '株式会社タルーヴ', contactName: 'Café Müller', role: 'Zürich', phone: '+63 917', message: 'Hola, señor.\nمرحبا' }),
    );
    expect(r).toMatchObject({ company: '株式会社タルーヴ', contactName: 'Café Müller', role: 'Zürich' });
    expect(r.message).toBe('Hola, señor.\nمرحبا');
  });
});

describe('parseInquiry: remaining field limits', () => {
  it('contact name: 81 rejected, 80 accepted', () => {
    reject(valid({ contactName: 'a'.repeat(81) }), /Contact name is too long/);
    expect(parseInquiry(valid({ contactName: 'a'.repeat(80) })).contactName).toHaveLength(80);
  });
  it('email: 201 characters rejected', () => {
    const email = `${'a'.repeat(201 - '@b.example'.length)}@b.example`;
    expect(email).toHaveLength(201);
    reject(valid({ email }), /Email is too long/);
  });
  it('email: 200 characters accepted', () => {
    const email = `${'a'.repeat(200 - '@b.example'.length)}@b.example`;
    expect(parseInquiry(valid({ email })).email).toHaveLength(200);
  });
  it('role: 81 rejected, 80 accepted', () => {
    reject(valid({ role: 'a'.repeat(81) }), /Role is too long/);
    expect(parseInquiry(valid({ role: 'a'.repeat(80) })).role).toHaveLength(80);
  });
  it('phone: 40 accepted', () => {
    expect(parseInquiry(valid({ phone: '1'.repeat(40) })).phone).toHaveLength(40);
  });
});

describe('parseInquiry: honeypot, non-string values', () => {
  it.each([[0], [false], [{}], [[]]])('rejects website %j with the generic message', (website) => {
    reject(valid({ website }), /^Invalid request$/);
  });
});

describe('parse.ts source hygiene (Trojan Source)', () => {
  it('contains no raw invisible bidi characters', async () => {
    const { readFileSync } = await import('node:fs');
    const invisible = new RegExp('[\u200E\u200F\u202A-\u202E\u2066-\u2069]');
    for (const file of ['lib/inquiry/parse.ts', 'lib/inquiry/parse.test.ts']) {
      expect(invisible.test(readFileSync(file, 'utf8')), file).toBe(false);
    }
  });
});

describe('parseInquiry: hostile ids', () => {
  it('parses __proto__ and constructor ids without polluting Object.prototype', () => {
    const items = [
      { productId: '__proto__', packId: 'single', quantity: 1 },
      { productId: 'constructor', packId: 'pair', quantity: 1 },
    ];
    const result = parseInquiry(valid({ items }));
    expect(result.lines.map((l) => l.productId)).toEqual(['__proto__', 'constructor']);
    expect(({} as Record<string, unknown>).quantity).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('productId');
  });

  it('parses a body carrying a JSON __proto__ key without pollution', () => {
    const body = JSON.parse(
      '{"__proto__": {"polluted": true}, "company":"C","contactName":"N","email":"a@b.example","items":[{"productId":"__proto__","packId":"single","quantity":1}]}',
    );
    parseInquiry(body);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
