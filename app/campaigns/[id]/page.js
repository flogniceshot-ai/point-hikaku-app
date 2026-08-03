import { getCampaignById, getCampaignHistory, usingRealDatabase, DATA_NOTE } from "../../../lib/db";
import OfferRow from "../../components/OfferRow";
import HistoryChart from "../../components/HistoryChart";

export default async function CampaignDetailPage({ params }) {
  const { id } = await params;
  const campaign = await getCampaignById(id);

  if (!campaign) {
    return (
      <>
        <a href="/" className="back-link">
          ← 検索に戻る
        </a>
        <div className="error-state">案件が見つかりませんでした。</div>
      </>
    );
  }

  const history = await getCampaignHistory(id);
  const offers = campaign.offers || [];

  return (
    <>
      <a href="/" className="back-link">
        ← 検索に戻る
      </a>
      <h1 className="detail-title">{campaign.canonicalName}</h1>
      <p className="detail-meta">
        {campaign.aiResearched && <span className="badge badge-ai">AI調査</span>}
        {!usingRealDatabase && <span className="badge badge-mock" style={{ marginLeft: campaign.aiResearched ? 6 : 0 }}>スナップショットデータ</span>}
        {campaign.lastChecked && (
          <span style={{ marginLeft: 8 }}>
            最終確認: {new Date(campaign.lastChecked).toLocaleDateString("ja-JP")}
          </span>
        )}
      </p>

      <div className="card">
        <div className="offer-list">
          {offers.map((offer, i) => (
            <OfferRow key={offer.siteSlug || i} offer={offer} isTop={i === 0} />
          ))}
        </div>
        {campaign.aiNote && <p className="ai-note">{campaign.aiNote}</p>}
      </div>

      <h2 className="section-title">還元額の推移</h2>
      <HistoryChart history={history} />

      {!usingRealDatabase && <p className="data-note">{DATA_NOTE}</p>}
    </>
  );
}
