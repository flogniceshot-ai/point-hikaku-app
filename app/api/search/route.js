import { NextResponse } from "next/server";
import { searchCampaigns, usingRealDatabase, DATA_NOTE } from "../../../lib/db";

// GET /api/search?q=楽天カード
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("q") || "";

  try {
    const results = await searchCampaigns(keyword);
    return NextResponse.json({
      keyword,
      count: results.length,
      results,
      source: usingRealDatabase ? "database" : "mock-snapshot",
      dataNote: usingRealDatabase ? null : DATA_NOTE,
    });
  } catch (err) {
    return NextResponse.json({ error: "検索に失敗しました", detail: String(err.message || err) }, { status: 500 });
  }
}
