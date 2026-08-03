// ------------------------------------------------------------------
// data/seed.json の内容を PostgreSQL(Supabase等) に投入するスクリプト。
// db_schema.sql を先に流し込んでテーブルを作成した後に実行してください。
//
// 実行方法:
//   .env.local に DATABASE_URL=postgres://... を書いておけば、
//   npm run seed だけで動きます（環境変数を手動で設定する必要はありません）。
// ------------------------------------------------------------------
require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");
const seed = require("../data/seed.json");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL が設定されていません。Supabase等の接続文字列を指定してください。");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("supabase") ? { rejectUnauthorized: false } : undefined,
  });

  console.log("サイト情報を投入中...");
  const siteIdBySlug = {};
  for (const s of seed.sites) {
    const { rows } = await pool.query(
      `INSERT INTO point_sites (slug, name, site_url, point_rate, color_hex, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, color_hex = EXCLUDED.color_hex
       RETURNING id`,
      [s.slug, s.name, `https://example.com/${s.slug}`, s.pointRate, s.colorHex]
    );
    siteIdBySlug[s.slug] = rows[0].id;
  }

  console.log("カテゴリを投入中...");
  const { rows: catRows } = await pool.query(
    `INSERT INTO categories (slug, name) VALUES ('card', 'クレジットカード')
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`
  );
  const cardCategoryId = catRows[0].id;

  console.log("案件・オファー・履歴を投入中...");
  for (const c of seed.campaigns) {
    const { rows: campRows } = await pool.query(
      `INSERT INTO campaigns (id, canonical_name, category_id, reward_type, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (id) DO UPDATE SET canonical_name = EXCLUDED.canonical_name
       RETURNING id`,
      [c.id, c.canonicalName, cardCategoryId, c.rewardType]
    );
    const campaignId = campRows[0].id;

    for (const o of c.offers) {
      await pool.query(
        `INSERT INTO campaign_offers (campaign_id, site_id, offer_url, reward_value, is_first_time_only, is_guaranteed, fetched_at)
         VALUES ($1, $2, $3, $4, $5, $6, now())
         ON CONFLICT (campaign_id, site_id) DO UPDATE SET reward_value = EXCLUDED.reward_value, fetched_at = now()`,
        [campaignId, siteIdBySlug[o.siteSlug], `https://example.com/${o.siteSlug}/${campaignId}`, o.value, o.firstTimeOnly, o.guaranteed]
      );
    }

    for (const h of c.history) {
      await pool.query(
        `INSERT INTO offer_history (campaign_id, site_id, reward_value, recorded_at)
         VALUES ($1, $2, $3, $4)`,
        [campaignId, siteIdBySlug[c.offers[0].siteSlug], h.value, h.date]
      );
    }
  }

  console.log("投入完了しました。");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
