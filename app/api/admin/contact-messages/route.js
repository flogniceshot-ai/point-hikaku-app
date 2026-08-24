import { NextResponse } from "next/server";
import { listContactMessages, markContactMessageRead, deleteContactMessage } from "../../../../lib/db";

// POST /api/admin/contact-messages
// body: { secret, action?, id? }
//   action省略      -> 問い合わせ一覧を返す
//   action:"read"   -> idのメッセージを既読にする
//   action:"unread" -> idのメッセージを未読に戻す
//   action:"delete" -> idのメッセージを削除する
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

  const { secret, action, id } = body || {};

  if (secret !== adminSecret) {
    return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
  }

  try {
    if (!action) {
      const messages = await listContactMessages();
      return NextResponse.json({ messages });
    }
    if (!id) {
      return NextResponse.json({ error: "idが必要です" }, { status: 400 });
    }
    if (action === "read" || action === "unread") {
      const ok = await markContactMessageRead(id, action === "read");
      if (!ok) return NextResponse.json({ error: "対象が見つかりませんでした" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }
    if (action === "delete") {
      const ok = await deleteContactMessage(id);
      if (!ok) return NextResponse.json({ error: "対象が見つかりませんでした" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "不明なactionです" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "処理に失敗しました", detail: String(err.message || err) }, { status: 500 });
  }
}
