import { NextResponse } from "next/server";
import { updateSiteAffiliateUrl } from "../../../../lib/db";

// POST /api/admin/site-affiliate
// body: { secret, slug, affiliateUrl }
//   サイト(メディア)単位のアフィリエイトリンクを設定する。
//   案件詳細ページのメディア名リンクが、このURLへ差し替わる。
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

  const { secret, slug, affiliateUrl } = body || {};

  if (secret !== adminSecret) {
    return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
  }
  if (!slug) {
    return NextResponse.json({ error: "slugが必要です" }, { status: 400 });
  }

  try {
    const ok = await updateSiteAffiliateUrl(slug, affiliateUrl || null);
    if (!ok) {
      return NextResponse.json({ error: "サイトが見つかりません" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "更新に失敗しました", detail: String(err.message || err) }, { status: 500 });
  }
}
