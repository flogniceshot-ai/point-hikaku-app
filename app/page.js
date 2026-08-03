"use client";

import { useState } from "react";
import CampaignCard from "./components/CampaignCard";

export default function Page() {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSearch(e) {
    e.preventDefault();
    if (!keyword.trim()) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(keyword.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.detail || data.error || "検索に失敗しました");
        setStatus("error");
        return;
      }
      setResult(data);
      setStatus("done");
    } catch (err) {
      setErrorMsg(String(err.message || err));
      setStatus("error");
    }
  }

  return (
    <>
      <form className="search-form" onSubmit={handleSearch}>
        <input
          className="search-input"
          type="text"
          placeholder="案件名で検索（例：楽天カード）"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button className="search-button" type="submit" disabled={status === "loading"}>
          {status === "loading" ? "検索中…" : "検索"}
        </button>
      </form>
      <p className="search-hint">
        各ポイントサイトの還元額を横断比較できます。未登録の案件はAIがWeb検索して調べます（少し時間がかかります）。
      </p>

      {status === "loading" && <div className="loading-state">検索しています…</div>}

      {status === "error" && <div className="error-state">エラー: {errorMsg}</div>}

      {status === "done" && result && result.count === 0 && (
        <div className="empty-state">「{result.keyword}」に一致する案件は見つかりませんでした。</div>
      )}

      {status === "done" && result && result.count > 0 && (
        <div>
          {result.results.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
          {result.dataNote && <p className="data-note">{result.dataNote}</p>}
        </div>
      )}
    </>
  );
}
