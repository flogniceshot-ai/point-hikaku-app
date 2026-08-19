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
