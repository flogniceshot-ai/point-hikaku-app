import { SITE_HOMEPAGES, isSiteOwnUrl } from "../../lib/siteHomepages";

// 最終確認日時を「今日」「3日前」「2026/8/10」のような短い相対表記にする。
// 古すぎる(30日以上)場合はユーザーが鮮度を疑えるよう、あえて年月日で表示する。
function formatFetchedAt(fetchedAt) {
  if (!fetchedAt) return null;
  const date = new Date(fetchedAt);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return { label: "今日確認", stale: false };
  if (diffDays === 1) return { label: "1日前に確認", stale: false };
  if (diffDays < 7) return { label: `${diffDays}日前に確認`, stale: false };
  const ymd = date.toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric" });
  return { label: `${ymd}時点`, stale: diffDays >= 30 };
}

export default function OfferRow({ offer, isTop, rank, campaignId }) {
  const isRate = offer.value != null && offer.value < 100;
  const fetched = formatFetchedAt(offer.fetchedAt);
  // メディア名のリンク先は、本来はASP発行のアフィリエイトリンク(mediaAffiliateUrl)。
  // まだ発行前のサイトは、出典元の引用ブログ(sourceUrl)ではなく、
  // サイト本体のトップページ(SITE_HOMEPAGES)を暫定的に使う。
  const clickUrl = offer.mediaAffiliateUrl || SITE_HOMEPAGES[offer.siteSlug] || offer.sourceUrl;
  // ポイント数のリンク先は、そのメディア自身の案件詳細ページ(sourceUrlがそのサイト
  // 自身のドメインの場合のみ)。引用ブログのsourceUrlや未登録の場合は、
  // 自社の案件詳細ページ(/campaigns/[id])にフォールバックする。
  const hasOwnOfferUrl = isSiteOwnUrl(offer.sourceUrl, offer.siteSlug);
  const pointValueUrl = hasOwnOfferUrl ? offer.sourceUrl : campaignId ? `/campaigns/${campaignId}` : null;
  const siteNameContent = (
    <>
      <span className="site-dot" style={{ background: offer.colorHex || "#999" }} />
      {offer.site}
    </>
  );
  return (
    <div className={`offer-row${isTop ? " is-top" : ""}`}>
      {rank != null && <span className="offer-rank">{String(rank).padStart(2, "0")}</span>}
      <span className="offer-site">
        {clickUrl ? (
          <a
            className="offer-site-link"
            href={clickUrl}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            aria-label={`${offer.site}へ移動`}
          >
            {siteNameContent}
          </a>
        ) : (
          siteNameContent
        )}
        {offer.firstTimeOnly && <span className="offer-tags">初回限定</span>}
        {offer.guaranteed && <span className="offer-tags">保証あり</span>}
        {fetched && (
          <span
            className="offer-fetched-at"
            style={{
              fontSize: 11,
              color: fetched.stale ? "#ffb020" : "#6f8299",
              marginLeft: 6,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
            title={new Date(offer.fetchedAt).toLocaleString("ja-JP")}
          >
            {isTop && !fetched.stale && (
              <span
                aria-hidden="true"
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "#00f0ff",
                  boxShadow: "0 0 5px #00f0ff",
                  animation: "pulse 1.6s infinite",
                }}
              />
            )}
            {fetched.label}
          </span>
        )}
      </span>
      <span className="offer-right">
        {pointValueUrl ? (
          <a
            href={pointValueUrl}
            className="offer-value offer-value-link"
            aria-label={hasOwnOfferUrl ? `${offer.site}の案件詳細ページを見る` : "案件詳細ページを見る"}
            {...(hasOwnOfferUrl
              ? { target: "_blank", rel: "noopener noreferrer nofollow sponsored" }
              : {})}
          >
            {offer.value}
            {isRate ? "%" : "P"}
          </a>
        ) : (
          <span className="offer-value">
            {offer.value}
            {isRate ? "%" : "P"}
          </span>
        )}
      </span>
    </div>
  );
}
