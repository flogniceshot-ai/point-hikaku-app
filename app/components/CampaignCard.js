import OfferRow from "./OfferRow";

export default function CampaignCard({ campaign }) {
  const offers = campaign.offers || [];
  return (
    <div className="card campaign-card">
      <div className="campaign-card-header">
        <h2 className="campaign-name">
          <a href={`/campaigns/${campaign.id}`}>{campaign.canonicalName}</a>
        </h2>
        {campaign.aiResearched && <span className="badge badge-ai">AI調査</span>}
      </div>
      <div className="offer-list">
        {offers.map((offer, i) => (
          <OfferRow key={offer.siteSlug || i} offer={offer} isTop={i === 0} />
        ))}
      </div>
      {campaign.aiNote && <p className="ai-note">{campaign.aiNote}</p>}
    </div>
  );
}
