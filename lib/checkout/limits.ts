// CLIENT-SAFE and tiny on purpose: the field length limits shared by the
// server's request parser (lib/checkout/parse.ts) and the checkout form's
// maxLength attributes. parse.ts also pulls in the 249-country list, which the
// form does not need for this, so the numbers live here and both import them:
// change one in one place and the form can never accept more than the API does.
export const FIELD_LIMITS = {
  id: 64,
  company: 120,
  name: 80,
  email: 200,
  phone: 32,
  taxId: 40,
  poReference: 60,
  line: 160,
  barangay: 120,
  city: 120,
  province: 120,
  postal: 20,
  country: 80,
} as const;
