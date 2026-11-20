// Client-safe: no server imports. Shared by the form and the API route.
import type { PackId } from '@/lib/catalog/types';

export const INQUIRY_LIMITS = {
  company: 120, name: 80, email: 200, phone: 40, role: 80, message: 2000,
  maxLines: 20, maxQuantity: 1000, id: 64,
} as const;

/** A line asks about a model in a pack. There is no price here: packs carry only a label and a unit count. */
export interface InquiryLineInput {
  productId: string;
  packId: PackId;
  quantity: number;
}

export interface InquiryRequest {
  company: string;
  contactName: string;
  email: string;
  phone?: string;
  /** Job title or role, optional. */
  role?: string;
  /** Free-text notes: the project, the venue, anything else. Optional. */
  message?: string;
  items: InquiryLineInput[];
  /** Honeypot: hidden from visitors, must stay empty. */
  website?: string;
}

export interface InquiryResponse {
  reference: string;
}
