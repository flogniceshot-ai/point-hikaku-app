import { NextResponse } from "next/server";
import { deleteCampaign, deleteOffer } from "../../../../lib/db";

// POST /api/admin/delete
// body: { secret, campaignId, siteSlug? }
//   siteSlug を指定 -> そのサイトのオファーだけ削除
//   siteSlug 省略   -> 案件ごと削除
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

  const { secret, campaignId, siteSlug } = body || {};

  if (secret !== adminSecret) {
    return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
  }
  if (!campaignId) {
    return NextResponse.json({ error: "campaignIdが必要です" }, { status: 400 });
  }

  try {
    const deleted = siteSlug ? await deleteOffer(campaignId, siteSlug) : await deleteCampaign(campaignId);
    if (!deleted) {
      return NextResponse.json({ error: "対象が見つかりませんでした" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "削除に失敗しました", detail: String(err.message || err) }, { status: 500 });
  }
}
