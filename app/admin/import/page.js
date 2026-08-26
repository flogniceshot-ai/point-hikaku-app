"use client";

import { useEffect, useState } from "react";

// 貼り付けられたHTML(クリップボードのtext/html)から <a href> と、
// そのリンク内のテキストの対応表を作る。
// ページのコピー元URLがあれば、相対パスを絶対URLに解決する。
function extractAnchors(html, pageUrl) {
  if (!html) return [];
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const anchors = Array.from(doc.querySelectorAll("a[href]"));
    return anchors
      .map((a) => {
        const href = a.getAttribute("href");
        if (!href || href.startsWith("javascript:") || href.startsWith("#")) return null;
        let resolved = href;
        if (!/^https?:\/\//i.test(href)) {
          if (!pageUrl) return null;
          try {
            resolved = new URL(href, pageUrl).toString();
          } catch {
            return null;
          }
        }
        return { text: (a.textContent || "").replace(/\s+/g, ""), href: resolved };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

// 案件のテキスト(名前+還元額)を含むリンクを探す
function findLinkFor(anchors, name, valueLineRaw) {
  const needle = (name + valueLineRaw).replace(/\s+/g, "");
  let best = null;
  for (const a of anchors) {
    if (a.text.includes(valueLineRaw.replace(/\s+/g, "")) && a.text.includes(name.replace(/\s+/g, "").slice(0, 6))) {
      return a.href;
    }
    if (!best && a.text.includes(valueLineRaw.replace(/\s+/g, ""))) {
      best = a.href;
    }
  }
  return best;
}

// ポイントサイトのページからコピーしたテキストを、
// 「案件名」「条件」「還元額」の3行1セットっぽいパターンで拾い出す簡易パーサー。
// 完璧である必要はなく、あとで人間が確認・修正する前提。
function parseText(text, anchors) {
  const rawLinesInitial = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // アメフリ等、還元額の手前に「認証済」「購入金額の」のようなラベルが単独行で挟まるサイトに対応。
  // 単独行なら行ごと除去、行の先頭に付いているだけなら先頭だけ取り除く。
  const labelStrippedLines = rawLinesInitial
    .filter((l) => !/^(認証済|購入金額の)$/.test(l))
    .map((l) => l.replace(/^認証済\s*/, ""));

  // 「40,000」「pt」のように数値と単位が別行に分かれているケースをまとめて1行にする
  const bareNumRe = /^[\d,]+(?:\.\d+)?$/;
  const unitOnlyRe = /^(pt|Ｐ|P|％|%|円)$/i;
  const rawLines = [];
  for (let i = 0; i < labelStrippedLines.length; i++) {
    const line = labelStrippedLines[i];
    const next = labelStrippedLines[i + 1];
    if (bareNumRe.test(line) && next && unitOnlyRe.test(next)) {
      rawLines.push(line + next);
      i++; // 単位だけの行は消費済みなのでスキップ
      continue;
    }
    rawLines.push(line);
  }

  // "％"(全角)にも対応
  const percentRe = /^(?:購入金額の)?(\d+(?:\.\d+)?)\s*[%％]$/;
  // "pt" (ちょびリッチ・ポイントインカム等) と "P" 単体 (モッピー等) の両方に対応
  const ptRe = /^([\d,]+)\s*(?:pt|Ｐ|P)$/i;
  const yenRe = /^([\d,]+)\s*円$/;
  // ECナビなど、単位無しで「通常値 特別値」が並ぶだけの表記に対応
  const bareDualRe = /^([\d,]+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)$/;

  // アメフリの「チャレンジボーナス」「＋20,000pt」のような追加ボーナス表記や、
  // カウントダウンタイマー・口コミ欄のニックネームは、
  // 別案件として拾わない・名前候補にもしない
  const timerLikeRe = /^\d+(?:日)?\d+時間\d+分\d+秒$/;
  // ちょびリッチ等の「商品レビュー：★4.66」のようなレビューカルーセルの星評価も、
  // 実際の案件とは無関係のノイズなので名前候補から除外する
  // ライフメディア等のショッピングモール一覧ページでは、各商品タイルに
  // 「参考価格（税込）」のような固定ラベルが値の直前に繰り返し出現する。
  // このラベル自体は商品名ではないため、案件名候補から除外する
  // (除外しないと、全ての商品が同じ「参考価格（税込）」という名前で
  // 登録されてしまう)。
  // ライフメディアの「@niftyの接続サービスをご利用の方」「通常会員」のような、
  // 同じ案件に対する報酬ティア(会員種別/条件別の金額違い)のラベルも、
  // 案件名候補から除外する(除外しないと同じ案件が複数のバラバラな名前で
  // 重複登録されてしまう)。
  // 「未応募」「応募済」のような応募状況バッジも、参考価格の直前に
  // 挟まることが多いラベルなので同様に除外する。
  const conditionLikeRe =
    /^(条件[:：]|残り|ボーナス|チャレンジ|開催期間|獲得条件|付与時期|通常ポイント|追加ボーナス|ニックネーム|商品レビュー|参考価格|税込|税抜|未応募|応募済|★|＋|\+$)|の方$|^(新規|通常|プレミアム|ゴールド|プラチナ)?会員$|^最大[\d.]+[%％]$/;

  function isValueLine(line) {
    return percentRe.test(line) || ptRe.test(line) || yenRe.test(line) || bareDualRe.test(line) || timerLikeRe.test(line);
  }

  // アメフリのように「案件名 / 達成条件 / 還元額」の3行セットになっているサイトでは、
  // 還元額の直前の行は「登録+投資」「新規申込」のような達成条件であって案件名ではない。
  // それっぽい行(記号+・条件動詞で終わる)は名前候補から後回しにする。
  function looksLikeConditionPhrase(s) {
    // 括弧や英字を含む行は「（初回入金＋新規取引）」のように条件を含んだ案件名そのものの
    // 可能性が高いので、+/＋ だけでは条件行と判定しない
    const hasBracketOrLatin = /[【】()（）/／]|[A-Za-z]{2,}/.test(s);
    if (!hasBracketOrLatin && /[+＋]/.test(s)) return true;
    if (/(完了|発行|申込|開設|取引|契約|購入|来店|予約|登録|成果|加入|入会|通過|達成|成立|申請|利用|応募|参加|送信|視聴|閲覧|再生|来場|査定|相談|見積り?|ダウンロード|インストール|出資)$/.test(s))
      return true;
    return false;
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
    } else if ((m = bareDualRe.exec(line))) {
      // 2つ目(現在/特別値)の方を採用。100未満なら%、以上ならポイントとみなす
      value = Number(m[2].replace(/,/g, ""));
      valueType = value < 100 ? "percent" : "fixed";
    }

    if (value === null || !Number.isFinite(value) || value <= 0) continue;

    // 還元額の直前行がレビュー欄の星評価やニックネームなどの場合、
    // その案件自体が実在しない(レビューカルーセル等のノイズ)ので、
    // 名前をさかのぼって探さずにこのエントリ自体を丸ごと無視する
    const noiseImmediateRe = /^(商品レビュー|ニックネーム)/;
    if (i - 1 >= 0 && (noiseImmediateRe.test(rawLines[i - 1]) || timerLikeRe.test(rawLines[i - 1]))) {
      continue;
    }

    // 直前の行をさかのぼって、名前っぽい行を探す。
    // 達成条件っぽい行(looksLikeConditionPhrase)は一旦保留し、より名前らしい行があればそちらを優先する。
    let name = null;
    let fallbackName = null;
    for (let back = 1; back <= 4 && i - back >= 0; back++) {
      const cand = rawLines[i - back];
      if (isValueLine(cand)) continue;
      if (conditionLikeRe.test(cand)) continue;
      if (cand.length < 2 || cand.length > 80) continue;
      if (!fallbackName) fallbackName = cand;
      if (looksLikeConditionPhrase(cand)) continue;
      name = cand;
      break;
    }
    if (!name) name = fallbackName;
    if (!name) continue;

    // ECナビ等、1件が [案件名リンク][条件文リンク][還元額リンク] という
    // 同じhrefを持つ3つのリンクで構成されるサイトでは、テキストだけの逆算だと
    // 2番目の条件文リンク(例:「総合口座開設(無料)」)を案件名と誤認識しやすい。
    // (「NISA始めるなら【楽天証券】無料口座開設」のような本当の案件名は、
    //  条件文と単純な部分文字列関係にないため文字列ヒューリスティックでは補正できない)
    // pastedHtmlからリンク情報が取れている場合は、還元額と同じhrefを持つ
    // アンカー群の「最初のリンクのテキスト」を、より確実な案件名として優先する。
    if (anchors && anchors.length > 0) {
      const valueAnchor = anchors.find((a) => a.text.includes(line.replace(/\s+/g, "")));
      if (valueAnchor) {
        const group = anchors.filter((a) => a.href === valueAnchor.href);
        if (group.length >= 2 && group[0].text && group[0].text.length >= 2 && group[0].text.length <= 80) {
          name = group[0].text;
        }
      }
    }

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
      sourceUrl: anchors && anchors.length > 0 ? findLinkFor(anchors, name, line) : null,
    });
  }

  return found;
}

// まだ対応していないポイントサイトのワンクリック追加候補。
// 公式URL・ポイント交換レートは事前に調査済みの値。
const NEW_SITE_PRESETS = [
  { slug: "lifemedia", name: "ライフメディア", siteUrl: "https://lifemedia.jp/", pointRate: 1, colorHex: "#3b82f6" },
  { slug: "getmoney", name: "GetMoney!", siteUrl: "https://dietnavi.com/pc/", pointRate: 0.1, colorHex: "#ef4444" },
  { slug: "gendama", name: "げん玉", siteUrl: "https://www.gendama.jp/", pointRate: 0.1, colorHex: "#d946ef" },
  { slug: "sugutama", name: "すぐたま", siteUrl: "https://sugutama.jp/", pointRate: 0.5, colorHex: "#06b6d4" },
  { slug: "dotmoney", name: "ドットマネー", siteUrl: "https://d-money.jp/", pointRate: 1, colorHex: "#f43f5e" },
  { slug: "lineshopping", name: "LINEショッピング", siteUrl: "https://shopping.line.me/", pointRate: 1, colorHex: "#00b900" },
];

export default function AdminImportPage() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [sites, setSites] = useState([]);
  const [siteSlug, setSiteSlug] = useState("");
  const [addSiteStatus, setAddSiteStatus] = useState({}); // slug -> "adding" | "done" | "error"
  const [addSiteError, setAddSiteError] = useState({}); // slug -> エラーメッセージ
  const [rawText, setRawText] = useState("");
  const [pastedHtml, setPastedHtml] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [rows, setRows] = useState([]);
  const [submitStatus, setSubmitStatus] = useState("idle"); // idle | submitting | done | error
  const [submitResult, setSubmitResult] = useState(null);
  const [submitError, setSubmitError] = useState("");

  const [deleteKeyword, setDeleteKeyword] = useState("");
  const [deleteResults, setDeleteResults] = useState(null);
  const [deleteSearchStatus, setDeleteSearchStatus] = useState("idle");
  const [deleteActionMsg, setDeleteActionMsg] = useState("");

  function reloadSites(preferSlug) {
    fetch("/api/sites")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.sites)) {
          setSites(data.sites);
          if (preferSlug && data.sites.some((s) => s.slug === preferSlug)) setSiteSlug(preferSlug);
          else if (data.sites.length > 0 && !siteSlug) setSiteSlug(data.sites[0].slug);
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    reloadSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAddSite(preset) {
    setAddSiteStatus((prev) => ({ ...prev, [preset.slug]: "adding" }));
    setAddSiteError((prev) => ({ ...prev, [preset.slug]: "" }));
    try {
      const res = await fetch("/api/admin/add-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, ...preset }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddSiteStatus((prev) => ({ ...prev, [preset.slug]: "error" }));
        setAddSiteError((prev) => ({ ...prev, [preset.slug]: data.detail || data.error || `HTTP ${res.status}` }));
        return;
      }
      setAddSiteStatus((prev) => ({ ...prev, [preset.slug]: "done" }));
      reloadSites(preset.slug);
    } catch (err) {
      setAddSiteStatus((prev) => ({ ...prev, [preset.slug]: "error" }));
      setAddSiteError((prev) => ({ ...prev, [preset.slug]: String(err.message || err) }));
    }
  }

  function handlePaste(e) {
    const html = e.clipboardData.getData("text/html");
    if (html) setPastedHtml(html);
  }

  function handleParse() {
    const anchors = extractAnchors(pastedHtml, pageUrl.trim());
    setRows(parseText(rawText, anchors));
    setSubmitStatus("idle");
    setSubmitResult(null);
  }

  function updateRow(id, patch) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function handleDeleteSearch() {
    setDeleteSearchStatus("loading");
    setDeleteActionMsg("");
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(deleteKeyword.trim())}`);
      const data = await res.json();
      setDeleteResults(data.results || []);
      setDeleteSearchStatus("done");
    } catch (err) {
      setDeleteSearchStatus("error");
    }
  }

  async function handleDeleteCampaign(campaignId, name) {
    if (!confirm(`「${name}」を案件ごと削除します。よろしいですか？`)) return;
    try {
      const res = await fetch("/api/admin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, campaignId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteActionMsg(`削除失敗: ${data.error || ""}`);
        return;
      }
      setDeleteResults((prev) => prev.filter((c) => c.id !== campaignId));
      setDeleteActionMsg(`「${name}」を削除しました。`);
    } catch (err) {
      setDeleteActionMsg(`削除失敗: ${String(err.message || err)}`);
    }
  }

  async function handleDeleteOffer(campaignId, siteSlug, campaignName, siteName) {
    if (!confirm(`「${campaignName}」の${siteName}のオファーだけ削除します。よろしいですか？`)) return;
    try {
      const res = await fetch("/api/admin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, campaignId, siteSlug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteActionMsg(`削除失敗: ${data.error || ""}`);
        return;
      }
      setDeleteResults((prev) =>
        prev.map((c) =>
          c.id === campaignId ? { ...c, offers: c.offers.filter((o) => o.siteSlug !== siteSlug) } : c
        )
      );
      setDeleteActionMsg(`「${campaignName}」の${siteName}のオファーを削除しました。`);
    } catch (err) {
      setDeleteActionMsg(`削除失敗: ${String(err.message || err)}`);
    }
  }

  function removeRow(id) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}-${Math.random()}`,
        include: true,
        name: "",
        value: "",
        valueType: "fixed",
        guaranteed: false,
        firstTimeOnly: false,
        sourceUrl: null,
      },
    ]);
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
        sourceUrl: r.sourceUrl || null,
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
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>未対応サイトを追加</h2>
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
          まだ対応していないポイントサイトはボタン一つで登録できます(URL・交換レートは調査済みの値が入ります)。登録後、下の「対象サイト」で選べるようになります。
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {NEW_SITE_PRESETS.map((preset) => {
            const already = sites.some((s) => s.slug === preset.slug);
            const status = addSiteStatus[preset.slug];
            const isError = status === "error";
            return (
              <div key={preset.slug} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <button
                  type="button"
                  onClick={() => handleAddSite(preset)}
                  disabled={already || status === "adding"}
                  style={{
                    padding: "8px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                    border: `1px solid ${isError ? "#ff6b6b" : "var(--color-border)"}`,
                    borderRadius: "var(--radius)",
                    background: already ? "rgba(0,240,255,0.08)" : "var(--color-surface-2)",
                    color: already ? "var(--color-primary)" : isError ? "#ff8f8f" : "var(--color-text)",
                    cursor: already ? "default" : "pointer",
                  }}
                >
                  {already ? `✓ ${preset.name}` : status === "adding" ? `追加中… ${preset.name}` : `+ ${preset.name}`}
                  {isError && " (失敗)"}
                </button>
                {isError && addSiteError[preset.slug] && (
                  <span style={{ fontSize: 11, color: "#ff8f8f", maxWidth: 220 }}>
                    {addSiteError[preset.slug]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

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
          コピー元のページURL（任意・入れるとリンクも取り込めます）
        </label>
        <input
          type="text"
          className="search-input"
          style={{ width: "100%", marginBottom: 12 }}
          value={pageUrl}
          onChange={(e) => setPageUrl(e.target.value)}
          placeholder="例: https://pc.moppy.jp/"
        />

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          貼り付けエリア
        </label>
        <textarea
          className="search-input"
          style={{ width: "100%", minHeight: 200, fontFamily: "inherit" }}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          onPaste={handlePaste}
          placeholder="ここにポイントサイトのページからコピーしたテキストを貼り付け"
        />
        <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
          {pastedHtml ? "リンク情報を検出しました。" : "貼り付けるとリンク情報も自動で拾います。"}
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="search-button" onClick={handleParse}>
            解析する
          </button>
          <button
            type="button"
            onClick={addRow}
            style={{
              padding: "14px 20px",
              fontSize: 14,
              fontWeight: 700,
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            手入力で1件追加
          </button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="card">
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
            {rows.length}件あります（自動解析で単位がないサイトは0件のことがあります。その場合は上の「手入力で1件追加」で個別に追加してください）。内容を確認・修正してから登録してください。
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
                <span style={{ fontSize: 11, color: r.sourceUrl ? "#10b981" : "#d1d5db" }}>
                  {r.sourceUrl ? "🔗 リンクあり" : "リンクなし"}
                </span>
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

      <div className="card" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>登録済み案件の削除</h2>
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
          誤って登録してしまった案件や、特定サイトのオファーだけを検索して削除できます。空欄で検索すると全件出ます。
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            className="search-input"
            style={{ flex: 1 }}
            value={deleteKeyword}
            onChange={(e) => setDeleteKeyword(e.target.value)}
            placeholder="削除したい案件のキーワード（空欄で全件）"
          />
          <button className="search-button" onClick={handleDeleteSearch} disabled={deleteSearchStatus === "loading"}>
            {deleteSearchStatus === "loading" ? "検索中…" : "検索"}
          </button>
        </div>

        {deleteActionMsg && <p style={{ fontSize: 13, color: "#10b981", marginBottom: 12 }}>{deleteActionMsg}</p>}

        {deleteResults && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {deleteResults.length === 0 && <p style={{ fontSize: 13, color: "#6b7280" }}>該当なし</p>}
            {deleteResults.map((c) => (
              <div key={c.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <strong style={{ fontSize: 13 }}>{c.canonicalName}</strong>
                  <button
                    type="button"
                    onClick={() => handleDeleteCampaign(c.id, c.canonicalName)}
                    style={{ fontSize: 12, color: "#b91c1c" }}
                  >
                    案件ごと削除
                  </button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {c.offers.map((o) => (
                    <span
                      key={o.siteSlug}
                      style={{
                        fontSize: 11,
                        border: "1px solid #e5e7eb",
                        borderRadius: 999,
                        padding: "3px 8px",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {o.site}: {o.value}
                      {o.value < 100 ? "%" : "P"}
                      <button
                        type="button"
                        onClick={() => handleDeleteOffer(c.id, o.siteSlug, c.canonicalName, o.site)}
                        style={{ fontSize: 11, color: "#b91c1c" }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
