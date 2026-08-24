"use client";

import { useState } from "react";

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  } catch {
    return iso;
  }
}

export default function AdminContactPage() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [messages, setMessages] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [error, setError] = useState("");

  async function load(currentSecret) {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/admin/contact-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: currentSecret }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "取得に失敗しました");
        setStatus("error");
        return;
      }
      setMessages(data.messages || []);
      setStatus("done");
    } catch (err) {
      setError(String(err.message || err));
      setStatus("error");
    }
  }

  async function handleUnlock() {
    if (!secret) return;
    setUnlocked(true);
    await load(secret);
  }

  async function handleAction(id, action) {
    try {
      const res = await fetch("/api/admin/contact-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, action, id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "処理に失敗しました");
        return;
      }
      if (action === "delete") {
        setMessages((prev) => prev.filter((m) => m.id !== id));
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, isRead: action === "read" } : m))
        );
      }
    } catch (err) {
      alert(String(err.message || err));
    }
  }

  if (!unlocked) {
    return (
      <div className="card" style={{ maxWidth: 360, margin: "40px auto" }}>
        <h1 style={{ fontSize: 16, marginBottom: 12 }}>管理用パスワード</h1>
        <input
          type="password"
          className="search-input"
          style={{ width: "100%", marginBottom: 12 }}
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="パスワード"
        />
        <button className="search-button" onClick={handleUnlock}>
          入る
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 18, marginBottom: 4 }}>お問い合わせ一覧</h1>
      <p className="search-hint" style={{ marginBottom: 16 }}>
        {messages ? `${messages.length}件` : ""}
      </p>

      {status === "loading" && <div className="loading-state">読み込み中…</div>}
      {status === "error" && <div className="error-state">エラー: {error}</div>}

      {messages && messages.length === 0 && (
        <div className="card">
          <p style={{ margin: 0, color: "var(--color-text-muted)" }}>お問い合わせはまだありません。</p>
        </div>
      )}

      {messages && messages.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.map((m) => (
            <div
              key={m.id}
              className="card"
              style={{ opacity: m.isRead ? 0.6 : 1 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                <div>
                  <strong style={{ fontSize: 13 }}>{m.name || "（名前なし）"}</strong>{" "}
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>&lt;{m.email}&gt;</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--color-text-dim)", fontFamily: "var(--font-mono)" }}>
                  {formatDate(m.createdAt)}
                </span>
              </div>
              {m.category && (
                <div style={{ fontSize: 12, color: "var(--color-primary)", marginBottom: 6 }}>{m.category}</div>
              )}
              <p style={{ fontSize: 13, whiteSpace: "pre-wrap", margin: "0 0 10px" }}>{m.message}</p>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => handleAction(m.id, m.isRead ? "unread" : "read")}
                  style={{ fontSize: 12, color: "var(--color-primary)" }}
                >
                  {m.isRead ? "未読に戻す" : "既読にする"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("このお問い合わせを削除します。よろしいですか？")) handleAction(m.id, "delete");
                  }}
                  style={{ fontSize: 12, color: "#b91c1c" }}
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
