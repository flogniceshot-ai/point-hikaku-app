// ------------------------------------------------------------------
// AI調査レイヤー
//
// Anthropic API を Web検索ツール付きで呼び出し、指定した案件(キーワード)の
// 各ポイントサイトでの現在の還元額を調べて構造化データとして返す。
//
// 注意:
//  - ポイントサイト本体を直接自動巡回(スクレイピング)することはしない。
//    Web検索経由で見つかる公開情報(比較ブログ・ニュース記事など)をもとに
//    Claudeが要約・整理する形をとる。
//  - 会員限定ページの情報は取得できない/しない。
// ------------------------------------------------------------------

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic(); // 環境変数 ANTHROPIC_API_KEY を使用

export const TARGET_SITES = [
  "ハピタス", "モッピー", "ちょびリッチ", "Powl", "ポイントインカム",
  "コインカム", "ワラウ", "ECナビ", "アメフリ", "ポイントタウン",
];

function buildPrompt(keyword) {
  const today = new Date().toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `あなたはポイ活比較サイトのデータ調査アシスタントです。
今日の日付は${today}です。
「${keyword}」という案件について、Web検索を使って調べ、以下のポイントサイトそれぞれの
「本日${today}時点」で表示されている還元額(円 または %)を教えてください。

対象サイト: ${TARGET_SITES.join("、")}

ルール:
- ポイントサイト本体の会員限定ページには絶対にアクセスしようとしないでください。
- 公開されているポイ活比較ブログ、ニュース記事、各サイトの公開キャンペーンページなど、
  一般公開されている情報のみを情報源としてください。
- 比較ブログを参照する場合は、そのページ内に記載されている「更新日時」が
  本日${today}または直近1〜2日以内であることを確認してください。更新日時が古い、
  または不明なページの数字は使わないでください。
- 検索結果のスニペットやキャッシュされた古い情報をそのまま使わず、
  実際にページを開いて本日時点の最新表示を確認してください。
- 情報が見つからない、または鮮度を確認できないサイトは省略してください。
- 出典のURLを必ず残してください。
- 最後に、次のJSON形式のみを出力してください(説明文やコードブロック記法\`\`\`は付けないでください):

{
  "canonicalName": "案件の正式名称",
  "rewardType": "fixed または rate",
  "offers": [
    { "site": "サイト名", "value": 数値, "guaranteed": false, "firstTimeOnly": true, "sourceUrl": "情報源URL" }
  ],
  "note": "情報源や調査日時についての補足(日本語で1-2文)"
}

該当する情報が全く見つからなかった場合は、
{ "canonicalName": "${keyword}", "rewardType": "fixed", "offers": [], "note": "情報が見つかりませんでした" }
を返してください。`;
}

function extractJson(text) {
  // 最初の { から最後の } までを取り出す(前後に説明文が付いても耐えられるように)
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("AIの回答からJSONを取り出せませんでした: " + text.slice(0, 300));
  }
  return JSON.parse(text.slice(start, end + 1));
}

/**
 * キーワードで案件を調査する。
 * @param {string} keyword
 * @returns {Promise<{canonicalName:string, rewardType:string, offers:Array, note:string}>}
 */
export async function researchCampaign(keyword) {
  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: buildPrompt(keyword) }],
  });

  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const parsed = extractJson(text);

  if (!Array.isArray(parsed.offers)) parsed.offers = [];
  return parsed;
}
