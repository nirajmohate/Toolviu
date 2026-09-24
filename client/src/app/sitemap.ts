import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';
import { tools } from '@/lib/tools';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: site.url, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    ...tools.map((t) => ({
      url: `${site.url}/tools/${t.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    })),
    ...['about', 'contact', 'privacy', 'terms'].map((p) => ({
      url: `${site.url}/${p}`,
      lastModified: now,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    })),
  ];
}
