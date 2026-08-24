import { NextResponse } from "next/server";
import { createContactMessage } from "../../../lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/contact
// body: { name?, email, category?, message }
// 公開の問い合わせフォームからの送信を受け付け、DBに保存する。
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const name = String(body?.name || "").trim().slice(0, 100);
  const email = String(body?.email || "").trim().slice(0, 200);
  const category = String(body?.category || "").trim().slice(0, 50);
  const message = String(body?.message || "").trim().slice(0, 4000);

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "メールアドレスの形式が正しくありません" }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "お問い合わせ内容を入力してください" }, { status: 400 });
  }

  try {
    const { id } = await createContactMessage({ name, email, category, message });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ error: "送信に失敗しました", detail: String(err.message || err) }, { status: 500 });
  }
}
