import { NextResponse } from "next/server";
import { upsertOffersFromImport } from "../../../../lib/db";

// POST /api/admin/import
// body: { secret, siteSlug, entries: [{ name, value, valueType, guaranteed, firstTimeOnly }] }
//
// 手動でポイントサイトを閲覧して取得したデータを、案件名でマッチングしつつDBに反映する。
// 会員限定ページの自動巡回は行わない前提のツール。書き込みにはシークレットが必要。
export async function POST(request) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: "ADMIN_SECRETが未設定です" }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const { secret, siteSlug, entries } = body || {};

  if (secret !== adminSecret) {
    return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
  }
  if (!siteSlug || !Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: "siteSlugとentriesが必要です" }, { status: 400 });
  }

  try {
    const results = await upsertOffersFromImport({ siteSlug, entries });
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: "登録に失敗しました", detail: String(err.message || err) }, { status: 500 });
  }
}
