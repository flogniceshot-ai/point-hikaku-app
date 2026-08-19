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

export default function OfferRow({ offer, isTop }) {
  const isRate = offer.value != null && offer.value < 100;
  const fetched = formatFetchedAt(offer.fetchedAt);
  const siteNameContent = (
    <>
      <span className="site-dot" style={{ background: offer.colorHex || "#999" }} />
      {offer.site}
    </>
  );
  return (
    <div className={`offer-row${isTop ? " is-top" : ""}`}>
      <span className="offer-site">
        {offer.sourceUrl ? (
          <a
            className="offer-site-link"
            href={offer.sourceUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            aria-label={`${offer.site}の案件ページを開く`}
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
        <span className="offer-value">
          {offer.value}
          {isRate ? "%" : "P"}
        </span>
      </span>
    </div>
  );
}
