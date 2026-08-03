import { NextResponse } from "next/server";
import { getCampaignHistory } from "../../../../../lib/db";

// GET /api/campaigns/1/history
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const history = await getCampaignHistory(id);
    return NextResponse.json({ campaignId: id, history });
  } catch (err) {
    return NextResponse.json({ error: "履歴の取得に失敗しました", detail: String(err.message || err) }, { status: 500 });
  }
}
