import { searchCampaigns } from "../lib/db";
import { SITE_URL } from "../lib/site";
import { CATEGORIES } from "../lib/categories";

export default async function sitemap() {
  const staticRoutes = [
    { url: `${SITE_URL}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "monthly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: "monthly", priority: 0.2 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.2 },
  ];

  const categoryRoutes = CATEGORIES.map((c) => ({
    url: `${SITE_URL}/category/${c.slug}`,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  let campaignRoutes = [];
  try {
    const campaigns = await searchCampaigns("");
    campaignRoutes = campaigns.map((c) => {
      const timestamps = (c.offers || [])
        .map((o) => (o.fetchedAt ? new Date(o.fetchedAt).getTime() : null))
        .filter(Boolean);
      const lastModified = timestamps.length ? new Date(Math.max(...timestamps)) : undefined;
      return {
        url: `${SITE_URL}/campaigns/${c.id}`,
        lastModified,
        changeFrequency: "daily",
        priority: 0.7,
      };
    });
  } catch {
    // DB接続エラー時などはサイトマップを静的ページのみで返す
  }

  return [...staticRoutes, ...categoryRoutes, ...campaignRoutes];
}
