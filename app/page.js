"use client";

import { useState, useEffect } from "react";
import CampaignCard from "./components/CampaignCard";

export default function Page() {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  // 初回表示時に登録済みの案件一覧を軽く取得しておき、
  // ワンタップで検索できるチップとして出す
  useEffect(() => {
    fetch(`/api/search?q=`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.results)) {
          setSuggestions(data.results.map((c) => c.canonicalName));
        }
      })
      .catch(() => {});
  }, []);

  async function runSearch(q) {
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
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

  function handleSearch(e) {
    e.preventDefault();
    if (!keyword.trim()) return;
    runSearch(keyword.trim());
  }

  function handleChipClick(name) {
    setKeyword(name);
    runSearch(name);
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

      {suggestions.length > 0 && (
        <div className="chip-row">
          {suggestions.map((name) => (
            <button
              key={name}
              type="button"
              className="chip"
              onClick={() => handleChipClick(name)}
              disabled={status === "loading"}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {status === "loading" && (
        <div className="loading-state">
          <span className="spinner" aria-hidden="true" />
          検索しています…
        </div>
      )}

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
