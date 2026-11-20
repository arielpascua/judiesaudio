import { notFound, permanentRedirect } from 'next/navigation';
import { fetchPublicProductBySlug } from '@/lib/catalog/client';

// Old product URLs (bookmarks, search results) land on the inquiry for that model (308).
// The datasheet itself lives at /models/<slug>. An unknown or hostile slug is a plain 404,
// resolved at request time.
export default async function ProductRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await fetchPublicProductBySlug(slug);
  if (!product) notFound();
  permanentRedirect(`/inquiry?product=${encodeURIComponent(product.slug)}`);
}
