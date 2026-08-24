import { NextResponse } from "next/server";
import { createContactMessage } from "../../../lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Googleスプレッドシート連携(任意): GOOGLE_SHEETS_WEBHOOK_URL が設定されていれば、
// Google Apps ScriptのWebアプリ(doPost)へ問い合わせ内容を転送してシートに1行追加してもらう。
// 失敗してもDBへの保存自体は成功させたいので、ここのエラーは握りつぶしてログに残すだけにする。
async function notifyGoogleSheets(payload) {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[contact] Googleスプレッドシートへの転送に失敗しました:", err);
  }
}

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
    // Vercelのサーバーレス関数はレスポンス送出後すぐ処理を打ち切ることがあるため、
    // シート転送も完了を待ってから応答する(失敗してもDB保存自体は成功扱いにする)。
    await notifyGoogleSheets({
      id,
      name,
      email,
      category,
      message,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ error: "送信に失敗しました", detail: String(err.message || err) }, { status: 500 });
  }
}
