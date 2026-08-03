-- ポイ得ナビ: 本番DB(Supabase/PostgreSQL)用スキーマ
-- lib/db.js, scripts/seed.js が前提としているテーブル構造に合わせています。
-- Supabaseの SQL Editor にこの内容を貼り付けて実行してください。

CREATE TABLE IF NOT EXISTS point_sites (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  site_url TEXT,
  point_rate NUMERIC NOT NULL DEFAULT 1,
  color_hex TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

-- campaigns.id は data/seed.json の id をそのまま使うため SERIAL にせず、
-- 明示的に指定した整数を主キーとして受け付ける形にしています。
CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  reward_type TEXT NOT NULL DEFAULT 'fixed',
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS campaign_offers (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  site_id INTEGER NOT NULL REFERENCES point_sites(id) ON DELETE CASCADE,
  offer_url TEXT,
  reward_value NUMERIC NOT NULL,
  is_first_time_only BOOLEAN NOT NULL DEFAULT false,
  is_guaranteed BOOLEAN NOT NULL DEFAULT false,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, site_id)
);

CREATE TABLE IF NOT EXISTS offer_history (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  site_id INTEGER REFERENCES point_sites(id),
  reward_value NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_campaigns_canonical_name ON campaigns (canonical_name);
CREATE INDEX IF NOT EXISTS idx_campaign_offers_campaign_id ON campaign_offers (campaign_id);
CREATE INDEX IF NOT EXISTS idx_offer_history_campaign_id ON offer_history (campaign_id);
