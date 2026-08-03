import { NextResponse } from "next/server";
import { listSites, searchCampaigns } from "../../../../lib/db";

// GET /api/sites/hapitas  → そのサイトが掲載している案件一覧
export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    const sites = await listSites();
    const site = sites.find((s) => s.slug === slug);
    if (!site) {
      return NextResponse.json({ error: "サイトが見つかりません" }, { status: 404 });
    }
    const all = await searchCampaigns("");
    const campaigns = all
      .filter((c) => c.offers.some((o) => o.siteSlug === slug))
      .map((c) => {
        const offer = c.offers.find((o) => o.siteSlug === slug);
        return { id: c.id, name: c.canonicalName, value: offer.value, rewardType: c.rewardType };
      });
    return NextResponse.json({ site, campaigns });
  } catch (err) {
    return NextResponse.json({ error: "取得に失敗しました", detail: String(err.message || err) }, { status: 500 });
  }
}
