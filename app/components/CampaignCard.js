import OfferRow from "./OfferRow";
import { SITE_HOMEPAGES } from "../../lib/siteHomepages";

export default function CampaignCard({ campaign }) {
  const offers = campaign.offers || [];
  // 案件名クリックは、ベストオファー(先頭=還元額最大)のアフィリエイトリンクへ。
  // まだアフィリエイトリンク未発行のサイトは、出典元の引用ブログ(sourceUrl)ではなく
  // サイト本体のトップページ(SITE_HOMEPAGES)を暫定的に使う。
  // 自社の案件詳細ページへは、別途「詳細を見る」リンクから移動できるようにする。
  const bestOffer = offers[0];
  const bestClickUrl = bestOffer
    ? bestOffer.mediaAffiliateUrl || SITE_HOMEPAGES[bestOffer.siteSlug] || bestOffer.sourceUrl
    : null;
  return (
    <div className="card campaign-card">
      <div className="campaign-card-header">
        <h2 className="campaign-name">
          {bestClickUrl ? (
            <a
              href={bestClickUrl}
              target="_blank"
              rel="noopener noreferrer nofollow sponsored"
              className="campaign-name-link"
            >
              {campaign.canonicalName}
            </a>
          ) : (
            <span className="campaign-name-link">{campaign.canonicalName}</span>
          )}
          <a href={`/campaigns/${campaign.id}`} className="campaign-name-arrow">
            詳細を見る ›
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
