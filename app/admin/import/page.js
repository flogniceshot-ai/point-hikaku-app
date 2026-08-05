"use client";

import { useEffect, useState } from "react";

// ポイントサイトのページからコピーしたテキストを、
// 「案件名」「条件」「還元額」の3行1セットっぽいパターンで拾い出す簡易パーサー。
// 完璧である必要はなく、あとで人間が確認・修正する前提。
function parseText(text) {
  const rawLines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const percentRe = /^(?:購入金額の)?(\d+(?:\.\d+)?)\s*%$/;
  const ptRe = /^([\d,]+)\s*pt$/i;
  const yenRe = /^([\d,]+)\s*円$/;

  const conditionLikeRe = /^(条件[:：]|残り|ボーナス|開催期間|獲得条件|付与時期|通常ポイント|追加ボーナス|\+$)/;

  function isValueLine(line) {
    return percentRe.test(line) || ptRe.test(line) || yenRe.test(line);
  }

  const found = [];
  const seen = new Set();

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    let value = null;
    let valueType = null;

    let m;
    if ((m = ptRe.exec(line))) {
      value = Number(m[1].replace(/,/g, ""));
      valueType = "fixed";
    } else if ((m = yenRe.exec(line))) {
      value = Number(m[1].replace(/,/g, ""));
      valueType = "fixed";
    } else if ((m = percentRe.exec(line))) {
      value = Number(m[1]);
      valueType = "percent";
    }

    if (value === null || !Number.isFinite(value) || value <= 0) continue;

    // 直前の行をさかのぼって、名前っぽい行を探す
    let name = null;
    for (let back = 1; back <= 4 && i - back >= 0; back++) {
      const cand = rawLines[i - back];
      if (isValueLine(cand)) continue;
      if (conditionLikeRe.test(cand)) continue;
      if (cand.length < 2 || cand.length > 80) continue;
      name = cand;
      break;
    }
    if (!name) continue;

    const key = `${name}__${value}__${valueType}`;
    if (seen.has(key)) continue;
    seen.add(key);

    found.push({
      id: `${i}-${key}`,
      include: true,
      name,
      value,
      valueType,
      guaranteed: false,
      firstTimeOnly: /新規|初回/.test(name) || rawLines[i - 1]?.includes("新規"),
    });
  }

  return found;
}

export default function AdminImportPage() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [sites, setSites] = useState([]);
  const [siteSlug, setSiteSlug] = useState("");
  const [rawText, setRawText] = useState("");
  const [rows, setRows] = useState([]);
  const [submitStatus, setSubmitStatus] = useState("idle"); // idle | submitting | done | error
  const [submitResult, setSubmitResult] = useState(null);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    fetch("/api/sites")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.sites)) {
          setSites(data.sites);
          if (data.sites.length > 0) setSiteSlug(data.sites[0].slug);
        }
      })
      .catch(() => {});
  }, []);

  function handleParse() {
    setRows(parseText(rawText));
    setSubmitStatus("idle");
    setSubmitResult(null);
  }

  function updateRow(id, patch) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleSubmit() {
    const entries = rows
      .filter((r) => r.include && r.name.trim() && Number.isFinite(Number(r.value)))
      .map((r) => ({
        name: r.name.trim(),
        value: Number(r.value),
        valueType: r.valueType,
        guaranteed: r.guaranteed,
        firstTimeOnly: r.firstTimeOnly,
      }));

    if (entries.length === 0) return;

    setSubmitStatus("submitting");
    setSubmitError("");
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, siteSlug, entries }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.detail || data.error || "登録に失敗しました");
        setSubmitStatus("error");
        return;
      }
      setSubmitResult(data.results);
      setSubmitStatus("done");
    } catch (err) {
      setSubmitError(String(err.message || err));
      setSubmitStatus("error");
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
        <button className="search-button" onClick={() => secret && setUnlocked(true)}>
          入る
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 18, marginBottom: 4 }}>手動データ取り込み</h1>
      <p className="search-hint">
        ポイントサイトのページで案件一覧を選択してコピーし、下に貼り付けてください。会員限定ページの自動巡回は行いません。
      </p>

      <div className="card" style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          対象サイト
        </label>
        <select
          className="search-input"
          style={{ width: "100%", marginBottom: 12 }}
          value={siteSlug}
          onChange={(e) => setSiteSlug(e.target.value)}
        >
          {sites.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          貼り付けエリア
        </label>
        <textarea
          className="search-input"
          style={{ width: "100%", minHeight: 200, fontFamily: "inherit" }}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="ここにポイントサイトのページからコピーしたテキストを貼り付け"
        />
        <button className="search-button" style={{ marginTop: 12 }} onClick={handleParse}>
          解析する
        </button>
      </div>

      {rows.length > 0 && (
        <div className="card">
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
            {rows.length}件の候補を見つけました。内容を確認・修正してから登録してください。
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 8,
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  flexWrap: "wrap",
                }}
              >
                <input
                  type="checkbox"
                  checked={r.include}
                  onChange={(e) => updateRow(r.id, { include: e.target.checked })}
                />
                <input
                  type="text"
                  value={r.name}
                  onChange={(e) => updateRow(r.id, { name: e.target.value })}
                  style={{ flex: "1 1 240px", padding: 6, border: "1px solid #e5e7eb", borderRadius: 6 }}
                />
                <input
                  type="number"
                  value={r.value}
                  onChange={(e) => updateRow(r.id, { value: e.target.value })}
                  style={{ width: 100, padding: 6, border: "1px solid #e5e7eb", borderRadius: 6 }}
                />
                <select
                  value={r.valueType}
                  onChange={(e) => updateRow(r.id, { valueType: e.target.value })}
                  style={{ padding: 6, border: "1px solid #e5e7eb", borderRadius: 6 }}
                >
                  <option value="fixed">pt</option>
                  <option value="percent">%</option>
                </select>
                <label style={{ fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={r.firstTimeOnly}
                    onChange={(e) => updateRow(r.id, { firstTimeOnly: e.target.checked })}
                  />{" "}
                  初回限定
                </label>
                <label style={{ fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={r.guaranteed}
                    onChange={(e) => updateRow(r.id, { guaranteed: e.target.checked })}
                  />{" "}
                  保証あり
                </label>
                <button type="button" onClick={() => removeRow(r.id)} style={{ fontSize: 12, color: "#b91c1c" }}>
                  削除
                </button>
              </div>
            ))}
          </div>

          <button
            className="search-button"
            style={{ marginTop: 16 }}
            onClick={handleSubmit}
            disabled={submitStatus === "submitting"}
          >
            {submitStatus === "submitting" ? "登録中…" : "登録する"}
          </button>

          {submitStatus === "error" && <div className="error-state">エラー: {submitError}</div>}

          {submitStatus === "done" && submitResult && (
            <div style={{ marginTop: 16, fontSize: 13 }}>
              <p>
                新規作成: {submitResult.filter((r) => r.action === "created").length}件 / 更新:{" "}
                {submitResult.filter((r) => r.action === "updated").length}件 / スキップ:{" "}
                {submitResult.filter((r) => r.action === "skipped").length}件
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
