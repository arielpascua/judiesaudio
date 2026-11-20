// CLIENT-SAFE. Phone numbers are optional on an order and are validated only
// loosely: a buyer may type a Philippine mobile number, a landline with an
// area code or an international number, and we cannot know the right format.
// What we do guarantee is that what is stored is digits with an optional
// leading "+", so the owner can dial it.

const ALLOWED = /^\+?[0-9 ()./-]+$/;

/** Digits (with a leading + kept) when `raw` looks like a phone number, otherwise null. */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || !ALLOWED.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, '');
  // E.164 allows at most 15 digits; fewer than 7 is not a dialable number.
  if (digits.length < 7 || digits.length > 15) return null;
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}
