import type { MetadataRoute } from 'next';
import { siteBase } from '@/lib/site';

// /checkout/ is disallowed as well as noindex: the private order link is never
// something a crawler should visit. The token that makes a checkout URL real is
// not in this file, so the Disallow line reveals a prefix, not a link.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/checkout/'] }],
    sitemap: `${siteBase()}/sitemap.xml`,
  };
}
