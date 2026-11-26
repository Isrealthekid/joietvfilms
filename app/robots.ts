import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    // The films manager stays out of search results.
    rules: { userAgent: '*', allow: '/', disallow: ['/admin/', '/dashboard/'] },
    sitemap: 'https://films.thejoietv.com/sitemap.xml',
    host: 'https://films.thejoietv.com',
  };
}
