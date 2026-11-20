// Client-safe request/response shapes shared by the route (producer of the
// response, consumer of the request) and the checkout UI (the opposite).
// Field names here are the contract: change them in both places or neither.

/** The business placing the order (B2B). company, contactName and email are required. */
export interface OrderCustomer {
  company: string;
  contactName: string;
  email: string;
  /** Normalised by lib/phone (digits with an optional leading +). */
  phone?: string;
  /** Tax identification number, e.g. a TIN, for the buyer's records. */
  taxId?: string;
  /** The buyer's own purchase-order reference. */
  poReference?: string;
}

export interface ShippingAddress {
  line1: string;
  line2?: string;
  barangay?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export interface CheckoutRequestItem {
  productId: string;
  packId: string;
  quantity: number;
}

export interface CheckoutRequest {
  /** The secret link token from the URL. The API answers 404 without the right one. */
  token: string;
  items: CheckoutRequestItem[];
  customer: OrderCustomer;
  shippingAddress: ShippingAddress;
}

export interface CheckoutResponse {
  reference: string;
  subtotal: number;
  shipping: number;
  total: number;
  itemCount: number;
  isDomestic: boolean;
  redirectUrl: string;
  /** False means we could not CONFIRM the order was saved on our side (it may or may not exist); the UI must say so. */
  persisted: boolean;
}
