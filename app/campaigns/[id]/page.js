import { getCampaignById, getCampaignHistory, usingRealDatabase, DATA_NOTE } from "../../../lib/db";
import { SITE_NAME, SITE_URL } from "../../../lib/site";
import OfferRow from "../../components/OfferRow";
import HistoryChart from "../../components/HistoryChart";

function bestOfferSummary(campaign) {
  const offers = campaign.offers || [];
  if (offers.length === 0) return null;
  // offersはDB/モックいずれも既に還元額の高い順で返ってくる
  const top = offers[0];
  if (campaign.rewardType === "rate") {
    return `最高${top.value}%（${top.site}）`;
  }
  const yen = Math.round(top.value * (top.pointRate ?? 1));
  return `最高${yen.toLocaleString("ja-JP")}円相当（${top.site}）`;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) {
    return { title: "案件が見つかりません" };
  }

  const summary = bestOfferSummary(campaign);
  const pageTitle = `${campaign.canonicalName}の還元率比較${summary ? "｜" + summary : ""}`;
  const fullTitle = `${pageTitle} | ${SITE_NAME}`;
  const description = `${campaign.canonicalName}について、ハピタス・モッピー・ちょびリッチなど主要ポイントサイトの還元額を横断比較。${
    summary ? summary + "。" : ""
  }どのサイト経由で申し込むのが一番お得か、${SITE_NAME}で確認できます。`;
  const url = `${SITE_URL}/campaigns/${id}`;

  return {
    title: pageTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: "ja_JP",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: fullTitle,
      description,
    },
  };
}

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

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: campaign.canonicalName,
        item: `${SITE_URL}/campaigns/${id}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
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
            <OfferRow key={offer.siteSlug || i} offer={offer} isTop={i === 0} rank={i + 1} />
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
