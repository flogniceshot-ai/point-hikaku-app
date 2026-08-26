import { NextResponse } from "next/server";
import { addSite } from "../../../../lib/db";

// POST /api/admin/add-site
// body: { secret, slug, name, siteUrl, pointRate, colorHex }
//   新しいポイントサイトをpoint_sitesに登録する。
//   手動取り込み(/api/admin/import)は登録済みのslugしか受け付けないため、
//   新サイトの案件を取り込む前にまずここでサイトを追加しておく。
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

  const { secret, slug, name, siteUrl, pointRate, colorHex } = body || {};

  if (secret !== adminSecret) {
    return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
  }
  if (!slug || !name) {
    return NextResponse.json({ error: "slugとnameが必要です" }, { status: 400 });
  }
  if (pointRate != null && !Number.isFinite(Number(pointRate))) {
    return NextResponse.json({ error: "pointRateは数値で指定してください" }, { status: 400 });
  }

  try {
    await addSite({
      slug: String(slug).trim(),
      name: String(name).trim(),
      siteUrl: siteUrl || null,
      pointRate: pointRate != null ? Number(pointRate) : 1,
      colorHex: colorHex || null,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "追加に失敗しました", detail: String(err.message || err) }, { status: 500 });
  }
}
