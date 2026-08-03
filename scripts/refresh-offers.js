// ------------------------------------------------------------------
// scripts/refresh-offers.js
//
// data/seed.json に登録済みの案件を、AI調査(Web検索付きAnthropic API)で
// 再チェックし、値が変わっていれば更新する。
//
// 実行方法:
//   node scripts/refresh-offers.js
//
// Windowsのタスクスケジューラで 0:00 / 10:00 / 19:00 に
// このコマンドを実行するように登録すれば、1日3回の自動更新になる。
//
// 安全のため、デフォルトでは自動反映せず「更新案」を
// data/refresh-log/ 以下にタイムスタンプ付きで出力するだけにしてある。
// 内容を確認して問題なければ、末尾の APPLY_CHANGES を true にして
// もう一度実行すると、data/seed.json に実際に反映される。
// ------------------------------------------------------------------

const fs = require("fs");
const path = require("path");
require("dotenv").config();
const Anthropic = require("@anthropic-ai/sdk");

// true にすると diff を data/seed.json に直接反映する。
// false の間は data/refresh-log/ に案を出力するだけ(確認用)。
const APPLY_CHANGES = false;

const SEED_PATH = path.join(process.cwd(), "data", "seed.json");
const LOG_DIR = path.join(process.cwd(), "data", "refresh-log");

const TARGET_SITES = [
  "ハピタス", "モッピー", "ちょびリッチ", "Powl", "ポイントインカム",
  "コインカム", "ワラウ", "ECナビ", "アメフリ", "ポイントタウン",
];

const anthropic = new Anthropic();

function buildPrompt(keyword) {
  return `あなたはポイ活比較サイトのデータ調査アシスタントです。
「${keyword}」という案件について、Web検索を使って調べ、以下のポイントサイトそれぞれの
現在の還元額(円 または %)を教えてください。

対象サイト: ${TARGET_SITES.join("、")}

ルール:
- ポイントサイト本体の会員限定ページには絶対にアクセスしようとしないでください。
- 公開されているポイ活比較ブログ、ニュース記事、各サイトの公開キャンペーンページなど、
  一般公開されている情報のみを情報源としてください。
- 情報が見つからないサイトは省略してください。
- 最後に、次のJSON形式のみを出力してください(説明文やコードブロック記法は付けないでください):

{
  "canonicalName": "案件の正式名称",
  "rewardType": "fixed または rate",
  "offers": [
    { "site": "サイト名", "value": 数値, "guaranteed": false, "firstTimeOnly": true, "sourceUrl": "情報源URL" }
  ],
  "note": "情報源や調査日時についての補足(日本語で1-2文)"
}`;
}

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("AIの回答からJSONを取り出せませんでした: " + text.slice(0, 300));
  }
  return JSON.parse(text.slice(start, end + 1));
}

async function researchCampaign(keyword) {
  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: buildPrompt(keyword) }],
  });
  const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const parsed = extractJson(text);
  if (!Array.isArray(parsed.offers)) parsed.offers = [];
  return parsed;
}

function slugForSiteName(seed, name) {
  const found = seed.sites.find((s) => s.name === name);
  return found ? found.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

async function main() {
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf-8"));
  const changes = [];

  for (const campaign of seed.campaigns) {
    console.log(`調査中: ${campaign.canonicalName} ...`);
    let researched;
    try {
      researched = await researchCampaign(campaign.canonicalName);
    } catch (err) {
      console.error(`  失敗: ${err.message}`);
      continue;
    }

    const newOffers = researched.offers
      .filter((o) => TARGET_SITES.includes(o.site))
      .map((o) => ({
        siteSlug: slugForSiteName(seed, o.site),
        value: Number(o.value) || 0,
        guaranteed: !!o.guaranteed,
        firstTimeOnly: !!o.firstTimeOnly,
      }));

    // 現在の値と比較して、差分があるサイトだけ記録
    const diffs = [];
    for (const nOffer of newOffers) {
      const old = campaign.offers.find((o) => o.siteSlug === nOffer.siteSlug);
      if (!old || old.value !== nOffer.value) {
        diffs.push({ siteSlug: nOffer.siteSlug, oldValue: old?.value ?? null, newValue: nOffer.value });
      }
    }

    if (diffs.length > 0) {
      changes.push({
        campaignId: campaign.id,
        canonicalName: campaign.canonicalName,
        diffs,
        note: researched.note || null,
        checkedAt: new Date().toISOString(),
      });

      if (APPLY_CHANGES) {
        for (const nOffer of newOffers) {
          const idx = campaign.offers.findIndex((o) => o.siteSlug === nOffer.siteSlug);
          if (idx >= 0) campaign.offers[idx] = { ...campaign.offers[idx], ...nOffer };
          else campaign.offers.push(nOffer);
        }
        campaign.lastChecked = new Date().toISOString();
      }
    }
  }

  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  const logPath = path.join(LOG_DIR, `refresh-${Date.now()}.json`);
  fs.writeFileSync(logPath, JSON.stringify(changes, null, 2), "utf-8");
  console.log(`\n変更点 ${changes.length} 件を ${logPath} に出力しました。`);

  if (APPLY_CHANGES) {
    fs.writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2), "utf-8");
    console.log("data/seed.json に反映しました。");
  } else {
    console.log("APPLY_CHANGES が false のため、seed.json への反映はスキップしました。");
    console.log("内容を確認して問題なければ、このファイル冒頭の APPLY_CHANGES を true にして再実行してください。");
  }
}

main().catch((err) => {
  console.error("実行中にエラーが発生しました:", err);
  process.exit(1);
});
