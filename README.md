# ポイ得ナビ API (Next.js API Routes)

## これは何か
`backend_design.md` / `db_schema.sql` を土台にした、実際に動くAPIの実装です。
**DBがまだ無い状態でもすぐ動きます**（`data/seed.json` の実データにフォールバックする設計）。
Supabase等のPostgreSQLを用意すれば、環境変数を1つ設定するだけで自動的に本物のDBに切り替わります。

## 1. まずはDB無しで動かす（今すぐできる）

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開き、リンクから各APIを確認してください。
この時点では `data/seed.json` （2026-07-25時点の実データスナップショット）が返ります。

## 2. Supabaseにつないで本物のDBに切り替える

1. https://supabase.com で無料プロジェクトを作成
2. SQL Editorで、以前渡した `db_schema.sql` の内容を実行（テーブル作成）
3. Settings > Database > Connection string（URI形式）をコピー
4. プロジェクト直下に `.env.local` を作成し、以下を記述：
   ```
   DATABASE_URL=postgres://postgres:xxxxx@xxxxx.supabase.co:5432/postgres
   ```
5. `pg` パッケージをインストール：
   ```bash
   npm install pg
   ```
6. シードデータ（`data/seed.json`）を投入：
   ```bash
   DATABASE_URL="postgres://..." npm run seed
   ```
7. `npm run dev` を再起動 → 各APIのレスポンスの `source` が `"mock-snapshot"` から `"database"` に変われば成功です

## 3. この後やること（クローラー連携）

このAPIは `campaign_offers` / `offer_history` テーブルを読むだけなので、
別途 `crawler_skeleton.py`（以前渡したもの）を GitHub Actions 等で定期実行し、
同じテーブルに書き込むようにすれば、**このAPI・フロントエンドのコードは一切変更せずに**
自動更新のデータへ切り替わります。

## API一覧

| メソッド | パス | 内容 |
|---|---|---|
| GET | `/api/search?q=キーワード` | 案件検索 |
| GET | `/api/campaigns/:id` | 案件詳細（サイト別オファー） |
| GET | `/api/campaigns/:id/history` | 還元履歴（グラフ用） |
| GET | `/api/sites` | ポイントサイト一覧 |
| GET | `/api/sites/:slug` | サイト別の掲載案件一覧 |

## ディレクトリ構成

```
app/
  page.js                          … 疎通確認用トップページ
  api/
    search/route.js                … GET /api/search
    campaigns/[id]/route.js        … GET /api/campaigns/:id
    campaigns/[id]/history/route.js
    sites/route.js                 … GET /api/sites
    sites/[slug]/route.js
lib/
  db.js                            … DB接続レイヤー（DATABASE_URL有無で自動切替）
data/
  seed.json                        … 実データのスナップショット（フォールバック用兼シード元）
scripts/
  seed.js                          … seed.json → Postgres への投入スクリプト
```
