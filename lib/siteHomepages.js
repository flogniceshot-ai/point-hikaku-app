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
