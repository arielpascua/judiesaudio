import { createLimiter } from '@/lib/checkout/rate-limit';

function limitFromEnv(): number {
  const n = Number(process.env.INQUIRY_RATE_LIMIT_PER_MIN);
  return Number.isInteger(n) && n > 0 ? n : 5;
}

/** The effective per-minute limit (INQUIRY_RATE_LIMIT_PER_MIN, default 5). */
export const INQUIRY_RATE_LIMIT = limitFromEnv();

export const inquiryLimiter = createLimiter({ limit: INQUIRY_RATE_LIMIT, windowMs: 60_000 });
