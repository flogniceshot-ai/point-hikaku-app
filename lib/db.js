// ------------------------------------------------------------------
// DB接続レイヤー
//
// 環境変数 DATABASE_URL が設定されていれば PostgreSQL(Supabase等)に接続する。
// 設定されていなければ data/seed.json の実データにフォールバックする。
//
// [追加] モックモードで、未登録のキーワードが検索されたときは、
// AI調査レイヤー(lib/research.js)を使ってその場で調べ、
// 結果を data/seed.json に保存する(次回からはキャッシュとして高速に返せる)。
// ------------------------------------------------------------------

import fs from "fs";
import path from "path";
import seedData from "../data/seed.json";
import { researchCampaign, TARGET_SITES } from "./research";

let pool = null;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (pool) return pool;
  const { Pool } = require("pg");
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("supabase") ? { rejectUnauthorized: false } : undefined,
  });
  return pool;
}

export const usingRealDatabase = !!process.env.DATABASE_URL;

// ------------------------------------------------------------------
// モックモード用: メモリ上の可変コピー + ディスクへの永続化
// ------------------------------------------------------------------
const SEED_PATH = path.join(process.cwd(), "data", "seed.json");

// プロセス起動時に一度だけ読み込み、以後はこのオブジェクトを直接書き換えていく
let seed = JSON.parse(JSON.stringify(seedData));

function persistSeed() {
  try {
    fs.writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2), "utf-8");
  } catch (err) {
    // 書き込みに失敗しても検索結果自体は返したいので、ログのみ
    console.error("[db] seed.json への書き込みに失敗しました:", err);
  }
}

function nextCampaignId() {
  const ids = seed.campaigns.map((c) => c.id);
  return (ids.length ? Math.max(...ids) : 0) + 1;
}

function slugForSiteName(name) {
  const found = seed.sites.find((s) => s.name === name);
  if (found) return found.slug;
  // 対象10サイトに含まれない名前をAIが返した場合の簡易フォールバック
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/**
 * AI調査結果を seed.campaigns の1件分の形式に変換する
 */
function toSeedCampaign(researched, keyword) {
  return {
    id: nextCampaignId(),
    canonicalName: researched.canonicalName || keyword,
    category: "unknown",
    rewardType: researched.rewardType === "rate" ? "rate" : "fixed",
    offers: researched.offers
      .filter((o) => TARGET_SITES.includes(o.site))
      .map((o) => ({
        siteSlug: slugForSiteName(o.site),
        value: Number(o.value) || 0,
        guaranteed: !!o.guaranteed,
        firstTimeOnly: !!o.firstTimeOnly,
        sourceUrl: o.sourceUrl || null,
      })),
    history: [],
    aiResearched: true,
    aiNote: researched.note || null,
    lastChecked: new Date().toISOString(),
  };
}

// ------------------------------------------------------------------
// 検索: キーワードに部分一致する案件と、その全サイトのオファーを返す
// ------------------------------------------------------------------
export async function searchCampaigns(keyword) {
  const p = getPool();

  if (!p) {
    // --- モックモード ---
    let matches = seed.campaigns.filter((c) => !keyword || c.canonicalName.includes(keyword));

    if (matches.length === 0 && keyword.trim()) {
      // 未登録キーワード → その場でAI調査して保存
      const researched = await researchCampaign(keyword.trim());
      if (researched.offers.length > 0) {
        const newCampaign = toSeedCampaign(researched, keyword.trim());
        seed.campaigns.push(newCampaign);
        persistSeed();
        matches = [newCampaign];
      }
    }

    return matches.map((c) => formatCampaignMock(c));
  }

  // --- 本物のPostgresモード ---
  const { rows } = await p.query(
    `SELECT c.id, c.canonical_name, c.reward_type
     FROM campaigns c
     WHERE c.is_active = true AND ($1 = '' OR c.canonical_name ILIKE '%' || $1 || '%')
     ORDER BY c.canonical_name`,
    [keyword || ""]
  );

  const results = [];
  for (const row of rows) {
    results.push(await getCampaignById(row.id));
  }
  return results;
}

// ------------------------------------------------------------------
// 案件詳細: 現在の全オファー(サイト別金額)を還元額の高い順で返す
// ------------------------------------------------------------------
export async function getCampaignById(id) {
  const p = getPool();

  if (!p) {
    const c = seed.campaigns.find((c) => String(c.id) === String(id));
    return c ? formatCampaignMock(c) : null;
  }

  const { rows: campaignRows } = await p.query(
    `SELECT id, canonical_name, reward_type FROM campaigns WHERE id = $1`,
    [id]
  );
  if (campaignRows.length === 0) return null;

  const { rows: offerRows } = await p.query(
    `SELECT o.reward_value, o.is_guaranteed, o.is_first_time_only, o.offer_url, s.slug, s.name, s.color_hex
     FROM campaign_offers o
     JOIN point_sites s ON s.id = o.site_id
     WHERE o.campaign_id = $1
     ORDER BY o.reward_value DESC`,
    [id]
  );

  return {
    id: campaignRows[0].id,
    canonicalName: campaignRows[0].canonical_name,
    rewardType: campaignRows[0].reward_type,
    offers: offerRows.map((o) => ({
      site: o.name,
      siteSlug: o.slug,
      colorHex: o.color_hex,
      value: Number(o.reward_value),
      guaranteed: o.is_guaranteed,
      firstTimeOnly: o.is_first_time_only,
      sourceUrl: o.offer_url || null,
    })),
  };
}

// ------------------------------------------------------------------
// 還元履歴: グラフ描画用の時系列データ
// ------------------------------------------------------------------
export async function getCampaignHistory(id) {
  const p = getPool();

  if (!p) {
    const c = seed.campaigns.find((c) => String(c.id) === String(id));
    return c ? c.history || [] : [];
  }

  const { rows } = await p.query(
    `SELECT recorded_at, reward_value
     FROM offer_history
     WHERE campaign_id = $1
     ORDER BY recorded_at ASC`,
    [id]
  );
  return rows.map((r) => ({ date: r.recorded_at, value: Number(r.reward_value) }));
}

// ------------------------------------------------------------------
// 案件の削除(管理画面用): 誤って登録した案件をまるごと削除する
// ------------------------------------------------------------------
export async function deleteCampaign(id) {
  const p = getPool();

  if (!p) {
    const before = seed.campaigns.length;
    seed.campaigns = seed.campaigns.filter((c) => String(c.id) !== String(id));
    persistSeed();
    return seed.campaigns.length < before;
  }

  const { rowCount } = await p.query(`DELETE FROM campaigns WHERE id = $1`, [id]);
  return rowCount > 0;
}

// 単一サイトのオファーだけを削除する(案件自体は残す)
export async function deleteOffer(campaignId, siteSlug) {
  const p = getPool();

  if (!p) {
    const campaign = seed.campaigns.find((c) => String(c.id) === String(campaignId));
    if (!campaign) return false;
    const before = campaign.offers.length;
    campaign.offers = campaign.offers.filter((o) => o.siteSlug !== siteSlug);
    persistSeed();
    return campaign.offers.length < before;
  }

  const { rows: siteRows } = await p.query(`SELECT id FROM point_sites WHERE slug = $1`, [siteSlug]);
  if (siteRows.length === 0) return false;
  const { rowCount } = await p.query(
    `DELETE FROM campaign_offers WHERE campaign_id = $1 AND site_id = $2`,
    [campaignId, siteRows[0].id]
  );
  return rowCount > 0;
}

// ------------------------------------------------------------------
// 案件の統合(管理画面用): 表記揺れで重複登録された案件を1つにまとめる。
// sourceId 側のオファー(target側にまだ無いサイトのみ)を targetId に付け替えて、
// sourceId は削除する。newName を渡すと target 側の案件名も同時に修正できる。
// ------------------------------------------------------------------
export async function mergeCampaigns(targetId, sourceId, newName) {
  const p = getPool();
  if (String(targetId) === String(sourceId)) return { merged: 0 };

  if (!p) {
    const target = seed.campaigns.find((c) => String(c.id) === String(targetId));
    const source = seed.campaigns.find((c) => String(c.id) === String(sourceId));
    if (!target || !source) return { merged: 0 };
    let merged = 0;
    for (const offer of source.offers) {
      const exists = target.offers.some((o) => o.siteSlug === offer.siteSlug);
      if (exists) continue;
      target.offers.push(offer);
      merged++;
    }
    if (newName) target.canonicalName = newName;
    seed.campaigns = seed.campaigns.filter((c) => String(c.id) !== String(sourceId));
    persistSeed();
    return { merged };
  }

  if (newName) {
    await p.query(`UPDATE campaigns SET canonical_name = $1 WHERE id = $2`, [newName, targetId]);
  }

  // target側にまだ無いサイトのオファーだけ target へ付け替える
  const { rowCount: merged } = await p.query(
    `UPDATE campaign_offers o
     SET campaign_id = $1
     WHERE o.campaign_id = $2
       AND NOT EXISTS (
         SELECT 1 FROM campaign_offers t WHERE t.campaign_id = $1 AND t.site_id = o.site_id
       )`,
    [targetId, sourceId]
  );
  // target側に既にあった(重複していた)sourceのオファーは削除
  await p.query(`DELETE FROM campaign_offers WHERE campaign_id = $1`, [sourceId]);
  // 還元額推移の履歴も target 側へ引き継ぐ
  await p.query(`UPDATE offer_history SET campaign_id = $1 WHERE campaign_id = $2`, [targetId, sourceId]);

  await p.query(`DELETE FROM campaigns WHERE id = $1`, [sourceId]);
  return { merged };
}

// ------------------------------------------------------------------
// ポイントサイト一覧
// ------------------------------------------------------------------
export async function listSites() {
  const p = getPool();

  if (!p) {
    return seed.sites;
  }

  const { rows } = await p.query(
    `SELECT slug, name, color_hex, point_rate FROM point_sites WHERE is_active = true ORDER BY name`
  );
  return rows.map((r) => ({ slug: r.slug, name: r.name, colorHex: r.color_hex, pointRate: Number(r.point_rate) }));
}

// ------------------------------------------------------------------
// 手動取り込み: ユーザーが実際にブラウジングしてコピペしたテキストから
// パースした候補を、案件名でマッチング(なければ新規作成)しつつDBに反映する。
// ------------------------------------------------------------------
export async function upsertOffersFromImport({ siteSlug, entries }) {
  const p = getPool();
  const results = [];

  if (!p) {
    // --- モックモード: seed.json を直接書き換える ---
    for (const e of entries) {
      const name = String(e.name || "").trim();
      if (!name || !Number.isFinite(e.value)) {
        results.push({ name, action: "skipped", reason: "名前または値が不正です" });
        continue;
      }
      let campaign = seed.campaigns.find(
        (c) => c.canonicalName.trim().toLowerCase() === name.toLowerCase()
      );
      let action = "updated";
      if (!campaign) {
        campaign = {
          id: nextCampaignId(),
          canonicalName: name,
          category: "unknown",
          rewardType: e.valueType === "percent" ? "rate" : "fixed",
          offers: [],
          history: [],
        };
        seed.campaigns.push(campaign);
        action = "created";
      }
      const idx = campaign.offers.findIndex((o) => o.siteSlug === siteSlug);
      const offerData = {
        siteSlug,
        value: e.value,
        guaranteed: !!e.guaranteed,
        firstTimeOnly: !!e.firstTimeOnly,
        sourceUrl: e.sourceUrl || null,
      };
      if (idx >= 0) campaign.offers[idx] = { ...campaign.offers[idx], ...offerData };
      else campaign.offers.push(offerData);
      campaign.lastChecked = new Date().toISOString();
      results.push({ name, action, campaignId: campaign.id });
    }
    persistSeed();
    return results;
  }

  // --- 本物のPostgresモード ---
  const { rows: siteRows } = await p.query(`SELECT id FROM point_sites WHERE slug = $1`, [siteSlug]);
  if (siteRows.length === 0) {
    throw new Error(`未知のサイトです: ${siteSlug}`);
  }
  const siteId = siteRows[0].id;

  for (const e of entries) {
    const name = String(e.name || "").trim();
    if (!name || !Number.isFinite(e.value)) {
      results.push({ name, action: "skipped", reason: "名前または値が不正です" });
      continue;
    }

    const { rows: existing } = await p.query(
      `SELECT id FROM campaigns WHERE lower(canonical_name) = lower($1) LIMIT 1`,
      [name]
    );

    let campaignId;
    let action;
    if (existing.length > 0) {
      campaignId = existing[0].id;
      action = "updated";
    } else {
      const { rows: maxRows } = await p.query(`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM campaigns`);
      campaignId = maxRows[0].next_id;
      const rewardType = e.valueType === "percent" ? "rate" : "fixed";
      await p.query(
        `INSERT INTO campaigns (id, canonical_name, reward_type, is_active) VALUES ($1, $2, $3, true)`,
        [campaignId, name, rewardType]
      );
      action = "created";
    }

    const { rows: lastHistory } = await p.query(
      `SELECT reward_value FROM offer_history
       WHERE campaign_id = $1 AND site_id = $2
       ORDER BY recorded_at DESC LIMIT 1`,
      [campaignId, siteId]
    );
    const lastValue = lastHistory.length ? Number(lastHistory[0].reward_value) : null;
    if (lastValue === null || lastValue !== e.value) {
      await p.query(
        `INSERT INTO offer_history (campaign_id, site_id, reward_value, recorded_at)
         VALUES ($1, $2, $3, now())`,
        [campaignId, siteId, e.value]
      );
    }

    await p.query(
      `INSERT INTO campaign_offers (campaign_id, site_id, reward_value, is_first_time_only, is_guaranteed, offer_url, fetched_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (campaign_id, site_id) DO UPDATE SET
         reward_value = EXCLUDED.reward_value,
         is_first_time_only = EXCLUDED.is_first_time_only,
         is_guaranteed = EXCLUDED.is_guaranteed,
         offer_url = COALESCE(EXCLUDED.offer_url, campaign_offers.offer_url),
         fetched_at = now()`,
      [campaignId, siteId, e.value, !!e.firstTimeOnly, !!e.guaranteed, e.sourceUrl || null]
    );

    results.push({ name, action, campaignId });
  }

  return results;
}

function formatCampaignMock(c) {
  const offers = c.offers
    .map((o) => {
      const site = seed.sites.find((s) => s.slug === o.siteSlug);
      return { site: site?.name || o.siteSlug, colorHex: site?.colorHex, ...o };
    })
    .sort((a, b) => b.value - a.value);
  return {
    id: c.id,
    canonicalName: c.canonicalName,
    rewardType: c.rewardType,
    offers,
    aiResearched: !!c.aiResearched,
    aiNote: c.aiNote || null,
    lastChecked: c.lastChecked || null,
  };
}

export const DATA_NOTE = seed.dataNote;
