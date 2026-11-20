import type { InquiryRequest, InquiryResponse } from './types';

const FALLBACK = 'We could not send your inquiry just now. Please try again in a moment.';

export async function submitInquiry(req: InquiryRequest): Promise<{ ok: true; reference: string } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/inquiry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
    });
    const json = (await res.json()) as Partial<InquiryResponse> & { error?: string };
    if (res.ok && typeof json.reference === 'string') return { ok: true, reference: json.reference };
    return { ok: false, error: typeof json.error === 'string' ? json.error : FALLBACK };
  } catch {
    return { ok: false, error: FALLBACK };
  }
}
