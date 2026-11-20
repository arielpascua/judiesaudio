import { Families } from '@/components/home/Families';
import { FeaturedRail } from '@/components/home/FeaturedRail';
import { Hero } from '@/components/home/Hero';
import { HomeCta } from '@/components/home/HomeCta';
import { HowBuyingWorks } from '@/components/home/HowBuyingWorks';
import { VenueFinder } from '@/components/home/VenueFinder';
import { fetchPublicProducts } from '@/lib/catalog/client';
import { APPLICATIONS } from '@/lib/catalog/types';
import { featuredProducts, venueResult } from '@/lib/home';

export const revalidate = 60;

export default async function HomePage() {
  const products = await fetchPublicProducts();
  const featured = featuredProducts(products);
  // The hero draws a real model's curve: the first featured model that makes sound.
  const traced = featured.find((p) => p.specs.lowHz !== null && p.specs.highHz !== null);
  const venues = APPLICATIONS.map((venue) => venueResult(products, venue)).filter((v) => v.total > 0);

  return (
    <>
      <Hero
        trace={
          traced && traced.specs.lowHz !== null && traced.specs.highHz !== null
            ? { name: traced.name, lowHz: traced.specs.lowHz, highHz: traced.specs.highHz }
            : null
        }
      />
      <VenueFinder venues={venues} />
      <FeaturedRail products={featured} total={products.length} />
      <Families />
      <HowBuyingWorks />
      <HomeCta />
    </>
  );
}
