import { NextResponse } from "next/server";
import { getCampaignById, usingRealDatabase, DATA_NOTE } from "../../../../lib/db";

// GET /api/campaigns/1
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });
    }
    return NextResponse.json({
      ...campaign,
      source: usingRealDatabase ? "database" : "mock-snapshot",
      dataNote: usingRealDatabase ? null : DATA_NOTE,
    });
  } catch (err) {
    return NextResponse.json({ error: "取得に失敗しました", detail: String(err.message || err) }, { status: 500 });
  }
}
