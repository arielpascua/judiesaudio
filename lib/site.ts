// Brand facts live here once so no page invents its own.

export const SITE_NAME = "Judie's Audio";

/** The one-line positioning used in metadata and the footer. */
export const TAGLINE = 'Sound systems and speakers for restaurants, shops, hotels, churches and halls.';

/**
 * We do not state a founding year, a client count, a certification or a warranty
 * term anywhere: none has been supplied. Add one here, once, when the owner
 * provides it, and nowhere else.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://judiesaudio.example';

/** SITE_URL without trailing slashes, ready to have a path appended (`${siteBase()}/sitemap.xml`). */
export function siteBase(siteUrl: string = SITE_URL): string {
  return siteUrl.replace(/\/+$/, '');
}

/** Hidden wherever it is used when unset. No invented contact details. */
export const CONTACT_EMAIL: string | null = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null;

/** Hidden wherever it is used when unset (international format, e.g. +639171234567). */
export const CONTACT_PHONE: string | null = process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim() || null;

/** "+639171234567" -> "+63 917 123 4567" for display (Philippine mobile format); anything else is shown as is. */
export function formatPhone(phone: string): string {
  const m = /^\+63(\d{3})(\d{3})(\d{4})$/.exec(phone);
  return m ? `+63 ${m[1]} ${m[2]} ${m[3]}` : phone;
}

/** Honest, owner-editable. Makes no timing or fee promise. */
export const DELIVERY_NOTE =
  'We confirm delivery fees and timing with you once your payment has been checked against our payment records.';

/**
 * Every product drawing is a schematic generated from the product specification,
 * not a photograph. Shown wherever a buyer relies on a drawing: the site footer
 * (every page) and About.
 */
export const IMAGE_DISCLOSURE =
  'Product drawings are schematics generated from each specification, not photographs. Finishes and proportions on the delivered product are as stated on its datasheet.';
