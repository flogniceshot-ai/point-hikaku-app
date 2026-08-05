export default function OfferRow({ offer, isTop }) {
  const isRate = offer.value != null && offer.value < 100;
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
