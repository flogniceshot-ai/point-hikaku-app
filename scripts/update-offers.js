// ------------------------------------------------------------------
// 案件データの自動更新スクリプト（クローラーの代替）
//
// ポイントサイト本体を直接スクレイピングするのではなく、
// lib/research.js と同じ方針で、Anthropic API (Web検索ツール付き) を使い、
// 公開されているポイ活比較ブログ・ニュース記事などから各案件の
// 現在の還元額を調べ直し、DB(campaign_offers / offer_history)に反映する。
//
// 実行方法:
//   .env.local に DATABASE_URL と ANTHROPIC_API_KEY を設定した状態で
//   node scripts/update-offers.js
//
// Cowork のスケジュール機能から定期実行することを想定。
// ------------------------------------------------------------------
require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");
const Anthropic = require("@anthropic-ai/sdk").default;

const TARGET_SITES = [
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
  "offers": [
    { "site": "サイト名", "value": 数値, "guaranteed": false, "firstTimeOnly": true, "sourceUrl": "情報源URL" }
  ],
  "note": "情報源や調査日時についての補足(日本語で1-2文)"
}

該当する情報が全く見つからなかった場合は、
{ "offers": [], "note": "情報が見つかりませんでした" }
を返してください。`;
}

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("AIの回答からJSONを取り出せませんでした: " + text.slice(0, 300));
  }
  return JSON.parse(text.slice(start, end + 1));
}

async function researchCampaign(anthropic, keyword) {
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL が設定されていません。更新をスキップします。");
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY が設定されていません。更新をスキップします。");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("supabase") ? { rejectUnauthorized: false } : undefined,
  });
  const anthropic = new Anthropic();

  // サイト名 -> id のマップを作っておく
  const { rows: siteRows } = await pool.query(`SELECT id, name FROM point_sites`);
  const siteIdByName = {};
  for (const s of siteRows) siteIdByName[s.name] = s.id;

  const { rows: campaigns } = await pool.query(
    `SELECT id, canonical_name FROM campaigns WHERE is_active = true ORDER BY id`
  );

  console.log(`${campaigns.length}件の案件を更新します...`);

  let updated = 0;
  let failed = 0;

  for (const c of campaigns) {
    try {
      console.log(`- [${c.id}] ${c.canonical_name} を調査中...`);
      const researched = await researchCampaign(anthropic, c.canonical_name);

      for (const o of researched.offers) {
        const siteId = siteIdByName[o.site];
        if (!siteId) {
          console.warn(`  (未知のサイト名のためスキップ: ${o.site})`);
          continue;
        }
        const value = Number(o.value) || 0;

        // 直近の履歴と値が変わっていたら履歴に追記(同じ値の連投を避ける)
        const { rows: lastHistory } = await pool.query(
          `SELECT reward_value FROM offer_history
           WHERE campaign_id = $1 AND site_id = $2
           ORDER BY recorded_at DESC LIMIT 1`,
          [c.id, siteId]
        );
        const lastValue = lastHistory.length ? Number(lastHistory[0].reward_value) : null;
        if (lastValue === null || lastValue !== value) {
          await pool.query(
            `INSERT INTO offer_history (campaign_id, site_id, reward_value, recorded_at)
             VALUES ($1, $2, $3, now())`,
            [c.id, siteId, value]
          );
        }

        await pool.query(
          `INSERT INTO campaign_offers (campaign_id, site_id, offer_url, reward_value, is_first_time_only, is_guaranteed, fetched_at)
           VALUES ($1, $2, $3, $4, $5, $6, now())
           ON CONFLICT (campaign_id, site_id) DO UPDATE SET
             reward_value = EXCLUDED.reward_value,
             offer_url = EXCLUDED.offer_url,
             is_first_time_only = EXCLUDED.is_first_time_only,
             is_guaranteed = EXCLUDED.is_guaranteed,
             fetched_at = now()`,
          [c.id, siteId, o.sourceUrl || null, value, !!o.firstTimeOnly, !!o.guaranteed]
        );
      }

      console.log(`  → ${researched.offers.length}件のオファーを反映しました。`);
      updated++;
    } catch (err) {
      console.error(`  ! 失敗: ${err.message || err}`);
      failed++;
    }

    // API負荷を抑えるため一呼吸置く
    await sleep(2000);
  }

  console.log(`完了: 成功 ${updated}件 / 失敗 ${failed}件`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
