// 各ポイントサイトの公式トップページURL。
// ASP発行のアフィリエイトリンク(affiliate_url)がまだ無いサイトのリンク先を、
// 出典元の引用ブログ(sourceUrl)ではなく、サイト本体のトップページに
// フォールバックさせるために使う。
// affiliate_url が設定され次第、そちらが優先される(呼び出し側の
// `mediaAffiliateUrl || SITE_HOMEPAGES[siteSlug] || sourceUrl` を参照)。
export const SITE_HOMEPAGES = {
  hapitas: "https://hapitas.jp/",
  moppy: "https://pc.moppy.jp/",
  chobirich: "https://www.chobirich.com/",
  powl: "https://web.powl.jp/",
  pointincome: "https://pointi.jp/",
  coincome: "https://cimcome.jp/",
  warau: "https://www.warau.jp/",
  ecnavi: "https://ecnavi.jp/",
  amefri: "https://www.amefri.net/",
  pointtown: "https://www.pointtown.com/",
};

// sourceUrl が「そのサイト本体のドメイン」かどうかを判定するためのベースドメイン一覧。
// 手動インポート(貼り付けHTMLからのリンク抽出)された案件は、出典元URL(sourceUrl)に
// そのメディア自身の案件詳細ページ(例: https://ecnavi.jp/ad/10712561/show/...)が
// 入っていることがある。一方AI調査で登録された案件のsourceUrlは、
// yurui-okozukai.com・bee-dash.comなどの引用ブログであることが多く、これらは
// 案件詳細ページとして使うべきではない。
const SITE_BASE_DOMAINS = {
  hapitas: ["hapitas.jp"],
  moppy: ["moppy.jp"],
  chobirich: ["chobirich.com"],
  powl: ["powl.jp"],
  pointincome: ["pointi.jp"],
  coincome: ["cimcome.jp"],
  warau: ["warau.jp"],
  ecnavi: ["ecnavi.jp"],
  amefri: ["amefri.net"],
  pointtown: ["pointtown.com", "japan-pointtown.com"],
};

// sourceUrl がそのメディア自身のドメインかどうかを判定する。
// 引用ブログ(yurui-okozukai.com等)はここでfalseになり、フォールバック先に回る。
export function isSiteOwnUrl(url, siteSlug) {
  if (!url || !siteSlug) return false;
  const domains = SITE_BASE_DOMAINS[siteSlug];
  if (!domains) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return domains.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

// サイトごとの「アイテム個別ページへのディープリンク」構築ルール。
// affiliate_url に登録しているのはサイトのトップ/汎用ページ(例: ハピタスの友達紹介ページ)
// のことが多く、そのままだと案件ごとの個別ページへは飛ばせない。
// 一方、比較検索サイト「どこ得」の実装を確認したところ、ハピタスは
// item/detail/itemid/<ID> のURLに ?apn=itemsharelink&i=<提携ID>&route=pcText を
// 付けるだけで、そのまま該当案件の個別ページに計測付きで遷移できることが分かった。
// 自社のaffiliate_url(hapitas.jp/appinvite?i=...&route=...)からiとrouteの値だけを
// 取り出し、sourceUrl(案件個別ページ)に付け替えることで、同じ仕組みを利用する。
const DEEP_LINK_BUILDERS = {
  hapitas: (sourceUrl, affiliateUrl) => {
    if (!sourceUrl || !affiliateUrl) return null;
    try {
      const src = new URL(sourceUrl);
      if (!/\/item\/detail\/itemid\//.test(src.pathname)) return null;
      const aff = new URL(affiliateUrl);
      const i = aff.searchParams.get("i");
      if (!i) return null;
      const route = aff.searchParams.get("route") || "pcText";
      src.searchParams.set("apn", "itemsharelink");
      src.searchParams.set("i", i);
      src.searchParams.set("route", route);
      return src.toString();
    } catch {
      return null;
    }
  },
};

// 案件個別ページへの計測付きディープリンクを構築できる場合はそれを返す。
// 対応サイト・対応パターン以外はnull(呼び出し側で従来のフォールバックを使う)。
export function buildDeepAffiliateUrl(offer) {
  if (!offer?.siteSlug || !isSiteOwnUrl(offer.sourceUrl, offer.siteSlug)) return null;
  const builder = DEEP_LINK_BUILDERS[offer.siteSlug];
  if (!builder) return null;
  return builder(offer.sourceUrl, offer.mediaAffiliateUrl);
}

// 各サイトのファビコン画像URL。自前で画像をホストせず、Googleのファビコン取得API
// (https://www.google.com/s2/favicons) を使って各サイトの実際のロゴ/アイコンを表示する。
// 取得に失敗した場合はOfferRow側で色付きドットにフォールバックする。
export function getSiteFaviconUrl(siteSlug) {
  const homepage = SITE_HOMEPAGES[siteSlug];
  if (!homepage) return null;
  try {
    const host = new URL(homepage).hostname;
    return `https://www.google.com/s2/favicons?sz=64&domain=${host}`;
  } catch {
    return null;
  }
}
