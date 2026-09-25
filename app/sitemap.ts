import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://bazzaro.example';
  return ['', '/account', '/vendor', '/admin'].map((path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: 'daily', priority: path === '' ? 1 : .6 }));
}
