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
  lifemedia: "https://lifemedia.jp/",
  getmoney: "https://dietnavi.com/pc/",
  gendama: "https://www.gendama.jp/",
  sugutama: "https://sugutama.jp/",
  dotmoney: "https://d-money.jp/",
  lineshopping: "https://ec.line.me/",
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
  lifemedia: ["lifemedia.jp"],
  getmoney: ["dietnavi.com"],
  gendama: ["gendama.jp"],
  sugutama: ["sugutama.jp"],
  dotmoney: ["d-money.jp"],
  lineshopping: ["shopping.line.me", "line.me"],
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
  // ポイントタウン: sourceUrl(item/<ID>)に、自社affiliate_url(registration?intrid=...)の
  // intrid値をそのまま付けるだけで案件個別ページに計測付きで遷移できる(どこ得の実装と同じ方式)。
  pointtown: (sourceUrl, affiliateUrl) => {
    if (!sourceUrl || !affiliateUrl) return null;
    try {
      const src = new URL(sourceUrl);
      if (!/^\/item\//.test(src.pathname)) return null;
      const aff = new URL(affiliateUrl);
      const intrid = aff.searchParams.get("intrid");
      if (!intrid) return null;
      src.searchParams.set("intrid", intrid);
      return src.toString();
    } catch {
      return null;
    }
  },
  // ECナビ: sourceUrl(ad/<ID>/show/)に invite_id(自社affiliate_urlのid値を付け替え)と
  // ecnframe(どこ得の実装から観測した固定値。自社発行の値が無いため暫定利用)を付ける。
  ecnavi: (sourceUrl, affiliateUrl) => {
    if (!sourceUrl || !affiliateUrl) return null;
    try {
      const src = new URL(sourceUrl);
      if (!/^\/ad\/\d+\/show\/?$/.test(src.pathname)) return null;
      const aff = new URL(affiliateUrl);
      const id = aff.searchParams.get("id");
      if (!id) return null;
      src.searchParams.set("invite_id", id);
      src.searchParams.set("ecnframe", "1058");
      return src.toString();
    } catch {
      return null;
    }
  },
  // Powl: sourceUrl(reward/<ID>)に、自社affiliate_url(?invite_code=...)のinvite_codeを
  // そのまま付けるだけで案件個別ページに計測付きで遷移できる。
  powl: (sourceUrl, affiliateUrl) => {
    if (!sourceUrl || !affiliateUrl) return null;
    try {
      const src = new URL(sourceUrl);
      if (!/^\/reward\/\d+\/?$/.test(src.pathname)) return null;
      const aff = new URL(affiliateUrl);
      const code = aff.searchParams.get("invite_code");
      if (!code) return null;
      src.searchParams.set("invite_code", code);
      return src.toString();
    } catch {
      return null;
    }
  },
  // ちょびリッチ: 案件詳細ページ(ad_details/<ID>)の「広告シェア」機能で発行される
  // 自分の会員番号(utm_content/utm_medium)を付けるだけで、その広告の紹介URLになる。
  // この会員番号は自社affiliate_url(ASP経由のcm/ad/リンク)には含まれていないため、
  // 実際にログインして広告シェアボタンから取得した自社の値をここに直接指定する。
  chobirich: (sourceUrl) => {
    if (!sourceUrl) return null;
    const OWN_MEMBER_ID = "3085774";
    try {
      const src = new URL(sourceUrl);
      if (!/^\/ad_details\/\d+\/?$/.test(src.pathname)) return null;
      src.searchParams.set("utm_source", "urlLink");
      src.searchParams.set("utm_medium", OWN_MEMBER_ID);
      src.searchParams.set("utm_content", OWN_MEMBER_ID);
      src.searchParams.set("utm_campaign", "social_btn");
      return src.toString();
    } catch {
      return null;
    }
  },
  // アメフリ: sourceUrl(detail/id/<ID>)に、自社affiliate_url(register?inv=...)のinv値を
  // そのまま付けるだけで案件個別ページに計測付きで遷移できる。
  amefri: (sourceUrl, affiliateUrl) => {
    if (!sourceUrl || !affiliateUrl) return null;
    try {
      const src = new URL(sourceUrl);
      if (!/^\/detail\/id\/\d+$/.test(src.pathname)) return null;
      const aff = new URL(affiliateUrl);
      const inv = aff.searchParams.get("inv");
      if (!inv) return null;
      src.searchParams.set("inv", inv);
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
