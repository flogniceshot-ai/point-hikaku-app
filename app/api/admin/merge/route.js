import { NextResponse } from "next/server";
import { mergeCampaigns } from "../../../../lib/db";

// POST /api/admin/merge
// body: { secret, targetId, sourceId, newName? }
//   sourceId のオファーを targetId に統合し、sourceId を削除する。
//   newName を指定すると target 側の案件名も更新する。
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

  const { secret, targetId, sourceId, newName } = body || {};

  if (secret !== adminSecret) {
    return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
  }
  if (!targetId || !sourceId) {
    return NextResponse.json({ error: "targetIdとsourceIdが必要です" }, { status: 400 });
  }

  try {
    const result = await mergeCampaigns(targetId, sourceId, newName || null);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: "統合に失敗しました", detail: String(err.message || err) }, { status: 500 });
  }
}
