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
      <span className="offer-value">
        {offer.value}
        {isRate ? "%" : "P"}
      </span>
    </div>
  );
}
