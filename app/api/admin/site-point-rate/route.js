import { NextResponse } from "next/server";
import { updateSitePointRate } from "../../../../lib/db";

// POST /api/admin/site-point-rate
// body: { secret, slug, pointRate }
//   サイト(メディア)単位のポイント⇔円交換レートを設定する。
//   例: 10pt=1円のサイトなら pointRate に 0.1 を渡す。
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

  const { secret, slug, pointRate } = body || {};

  if (secret !== adminSecret) {
    return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
  }
  if (!slug || !Number.isFinite(Number(pointRate)) || Number(pointRate) <= 0) {
    return NextResponse.json({ error: "slugと正のpointRateが必要です" }, { status: 400 });
  }

  try {
    const ok = await updateSitePointRate(slug, Number(pointRate));
    if (!ok) {
      return NextResponse.json({ error: "サイトが見つかりません" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "更新に失敗しました", detail: String(err.message || err) }, { status: 500 });
  }
}
