import OfferRow from "./OfferRow";

export default function CampaignCard({ campaign }) {
  const offers = campaign.offers || [];
  // 案件名クリックは自社の案件詳細ページ(履歴グラフ付き)へ。
  // 各ポイントサイトへの遷移(アフィリエイト/公式サイト)は、
  // 各行の「メディア名」リンク(OfferRow側)から行う。
  return (
    <div className="card campaign-card">
      <div className="campaign-card-header">
        <h2 className="campaign-name">
          <a href={`/campaigns/${campaign.id}`} className="campaign-name-link">
            {campaign.canonicalName}
          </a>
        </h2>
        {campaign.aiResearched && <span className="badge badge-ai">AI調査</span>}
      </div>
      <div className="offer-list">
        {offers.map((offer, i) => (
          <OfferRow key={offer.siteSlug || i} offer={offer} isTop={i === 0} rank={i + 1} />
        ))}
      </div>
      {campaign.aiNote && <p className="ai-note">{campaign.aiNote}</p>}
    </div>
  );
}
