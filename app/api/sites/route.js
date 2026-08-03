import { NextResponse } from "next/server";
import { listSites, usingRealDatabase } from "../../../lib/db";

// GET /api/sites
export async function GET() {
  try {
    const sites = await listSites();
    return NextResponse.json({ sites, source: usingRealDatabase ? "database" : "mock-snapshot" });
  } catch (err) {
    return NextResponse.json({ error: "取得に失敗しました", detail: String(err.message || err) }, { status: 500 });
  }
}
