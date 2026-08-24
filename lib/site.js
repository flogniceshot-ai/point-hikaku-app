// サイト全体で共有するメタ情報。
// 独自ドメイン運用開始後もVercelのデフォルトドメインでアクセスされた場合に備え、
// 環境変数で上書きできるようにしつつ、既定値は独自ドメインを指す。
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://poikatsu.link";
export const SITE_NAME = "ポイ活ナビ";
// Google Analytics 4 測定ID。値自体は公開情報のためコード直書きで問題ない。
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-ENQ5GJ813M";
export const SITE_DESCRIPTION =
  "ハピタス・モッピー・ちょびリッチなど主要10ポイントサイトの還元額を横断比較。同じ案件でもサイトによって還元額が違うポイ活の落とし穴を、検索するだけで一目で比較できます。";
