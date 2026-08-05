export default function OfferRow({ offer, isTop }) {
  const isRate = offer.value != null && offer.value < 100;
  return (
    <div className={`offer-row${isTop ? " is-top" : ""}`}>
      <span className="offer-site">
        <span className="site-dot" style={{ background: offer.colorHex || "#999" }} />
        {offer.site}
        {offer.firstTimeOnly && <span className="offer-tags">初回限定</span>}
        {offer.guaranteed && <span className="offer-tags">保証あり</span>}
      </span>
      <span className="offer-right">
        <span className="offer-value">
          {offer.value}
          {isRate ? "%" : "P"}
        </span>
        {offer.sourceUrl && (
          <a
            className="offer-source-link"
            href={offer.sourceUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={(e) => e.stopPropagation()}
            aria-label="出典ページを開く"
          >
            出典
          </a>
        )}
      </span>
    </div>
  );
}
