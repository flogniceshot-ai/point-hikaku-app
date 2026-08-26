// カテゴリ別一覧ページ用の分類定義。
// campaigns.category_id はDB上に存在するが実運用では使われていない(常に"unknown")ため、
// 案件名(canonicalName)に含まれるキーワードから、その場で簡易分類する方式を採用している。
// 1つの案件が複数カテゴリに属してもよい(例:「楽天カード」はcardのみ、
// 「【SBI証券】口座開設」はbank)。
//
// キーワードは実際の登録案件327件の名称を集計し、まとまった件数が見込めるものだけを
// 独立カテゴリにしている(1〜2件しかヒットしないカテゴリは、内容が薄くSEO上も
// 逆効果になりやすいため作らない)。
export const CATEGORIES = [
  {
    slug: "card",
    name: "クレジットカード",
    description: "クレジットカードの新規発行案件を、ハピタス・モッピーなど主要ポイントサイトの還元額で比較できます。",
    keywords: ["カード"],
  },
  {
    slug: "bank",
    name: "銀行口座・証券",
    description: "銀行口座開設やネット証券の口座開設案件を、ポイントサイトごとの還元額で比較できます。",
    keywords: ["口座開設", "銀行", "証券", "NISA", "積立", "Bank", "バンク"],
  },
  {
    slug: "investment",
    name: "投資・クラウドファンディング",
    description: "不動産投資の面談やクラウドファンディングへの投資案件を、還元額の高い順に比較できます。",
    keywords: ["投資", "ファンディング", "Funding", "クラウドファンディング", "REIT"],
  },
  {
    slug: "fx",
    name: "FX・為替取引",
    description: "FX口座開設・取引案件を、ポイントサイトごとの還元額で比較できます。",
    keywords: ["FX"],
  },
  {
    slug: "loan",
    name: "キャッシング・ローン",
    description: "カードローン・キャッシングの申込案件を、ポイントサイトごとの還元額で比較できます。",
    keywords: ["ローン", "キャッシング"],
  },
  {
    slug: "mobile",
    name: "通信・スマホ・ネット回線",
    description: "格安SIMやポケットWi-Fi、光回線などの通信サービス案件を還元額で比較できます。",
    keywords: ["SIM", "モバイル", "光", "Wi-Fi", "WiFi", "WiMAX", "回線", "スマホ", "ahamo"],
  },
  {
    slug: "video",
    name: "動画・音楽配信",
    description: "動画配信・音楽配信サービスの無料お試し登録案件を還元額で比較できます。",
    keywords: ["動画", "見放題", "Music", "Disney", "Prime", "VOD", "FANZA", "Netflix", "Hulu"],
  },
  {
    slug: "travel",
    name: "旅行・宿泊予約",
    description: "ホテル予約や航空券、旅行ツアーの予約案件を還元額で比較できます。",
    keywords: ["旅行", "ホテル", "ツアー", "航空券", "予約", "agoda", "Expedia", "Trip.com"],
  },
  {
    slug: "ec",
    name: "通販・ショッピング",
    description: "通販サイトでの購入案件を、ポイントサイトごとの還元率で比較できます。",
    keywords: [
      "ショッピング",
      "通販",
      "Amazon",
      "楽天市場",
      "Kobo",
      "iHerb",
      "AliExpress",
      "アリエクスプレス",
      "protein",
      "プロテイン",
      "adidas",
      "アディダス",
      "Oisix",
      "おいしっくす",
    ],
  },
  {
    slug: "realestate",
    name: "不動産・リフォーム",
    description: "不動産投資の個別面談やリフォーム一括見積もりの案件を還元額で比較できます。",
    keywords: ["不動産", "マンション", "リフォーム", "外壁塗装"],
  },
  {
    slug: "electricity",
    name: "電気・ガス",
    description: "電力会社・ガス会社の切り替え案件を、ポイントサイトごとの還元額で比較できます。",
    keywords: ["でんき", "電気", "ガス"],
  },
];

const CATEGORY_MAP = new Map(CATEGORIES.map((c) => [c.slug, c]));

export function getCategory(slug) {
  return CATEGORY_MAP.get(slug) || null;
}

// 案件名から、一致するカテゴリのslug一覧を返す(複数可)。
export function classifyCampaignName(name) {
  if (!name) return [];
  return CATEGORIES.filter((c) => c.keywords.some((k) => name.includes(k))).map((c) => c.slug);
}

// 指定カテゴリに属する案件だけを抽出する。
export function filterCampaignsByCategory(campaigns, slug) {
  const category = getCategory(slug);
  if (!category) return [];
  return campaigns.filter((c) => category.keywords.some((k) => c.canonicalName.includes(k)));
}
