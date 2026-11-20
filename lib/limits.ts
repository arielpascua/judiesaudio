/**
 * Hard ceiling on the quantity of any one product, summed across its packs.
 * Lives in its own module so client components (cart) can import it without
 * pulling the 249-country list that lib/pricing.ts carries.
 */
export const MAX_LINE_QUANTITY = 20;
