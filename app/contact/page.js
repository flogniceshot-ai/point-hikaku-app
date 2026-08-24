"use client";

import { useState } from "react";

const CATEGORIES = [
  { value: "", label: "選択してください" },
  { value: "掲載内容について", label: "掲載内容について（還元額の誤り・古い情報など）" },
  { value: "掲載依頼・提携について", label: "掲載依頼・提携について" },
  { value: "サイトの不具合", label: "サイトの不具合" },
  { value: "その他", label: "その他" },
];

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | done | error
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("submitting");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, category, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "送信に失敗しました");
        setStatus("error");
        return;
      }
      setStatus("done");
      setName("");
      setEmail("");
      setCategory("");
      setMessage("");
    } catch (err) {
      setError(String(err.message || err));
      setStatus("error");
    }
  }

  return (
    <div className="legal-page">
      <h1>お問い合わせ</h1>
      <p>
        掲載内容の誤りのご指摘、掲載・提携のご相談、サイトの不具合報告などは下記フォームよりお送りください。
        内容を確認のうえ、必要に応じて対応いたします（すべてのお問い合わせに返信できるとは限りません、あらかじめご了承ください）。
      </p>

      {status === "done" ? (
        <div className="card" style={{ marginTop: 16 }}>
          <p style={{ margin: 0, color: "var(--color-text)" }}>
            お問い合わせを受け付けました。ありがとうございます。
          </p>
        </div>
      ) : (
        <form className="card" style={{ marginTop: 16 }} onSubmit={handleSubmit}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            お名前（任意）
          </label>
          <input
            type="text"
            className="search-input"
            style={{ width: "100%", marginBottom: 16 }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="山田 太郎"
          />

          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            メールアドレス <span style={{ color: "#ff6b6b" }}>*</span>
          </label>
          <input
            type="email"
            required
            className="search-input"
            style={{ width: "100%", marginBottom: 16 }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@example.com"
          />

          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            お問い合わせ種別（任意）
          </label>
          <select
            className="search-input"
            style={{ width: "100%", marginBottom: 16 }}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            お問い合わせ内容 <span style={{ color: "#ff6b6b" }}>*</span>
          </label>
          <textarea
            required
            className="search-input"
            style={{ width: "100%", minHeight: 160, fontFamily: "inherit", marginBottom: 16 }}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="お問い合わせ内容をご記入ください"
          />

          <button className="search-button" type="submit" disabled={status === "submitting"}>
            {status === "submitting" ? "送信中…" : "送信する"}
          </button>

          {status === "error" && <div className="error-state" style={{ padding: "12px 0 0" }}>{error}</div>}
        </form>
      )}

      <h2>関連ページ</h2>
      <p>
        <a href="/about">運営者情報</a> ／ <a href="/privacy">プライバシーポリシー</a> ／{" "}
        <a href="/terms">利用規約</a>
      </p>
    </div>
  );
}
