"use client";

import { useMemo, useState } from "react";
import OfferRow from "./OfferRow";
import { SITE_HOMEPAGES, buildDeepAffiliateUrl } from "../../lib/siteHomepages";

const SORT_OPTIONS = [
  { key: "value", label: "還元額順" },
  { key: "site", label: "サイト名順" },
];

export default function CampaignCard({ campaign }) {
  const [sortKey, setSortKey] = useState("value");
  const offers = campaign.offers || [];
  // サーバー側は還元額の高い順で返ってくる。サイト名順を選んだ時だけ並び替える。
  const sortedOffers = useMemo(() => {
    if (sortKey === "site") {
      return [...offers].sort((a, b) => (a.site || "").localeCompare(b.site || "", "ja"));
    }
    return offers;
  }, [offers, sortKey]);
  // 案件名クリックは、ベストオファー(先頭=還元額最大)のアフィリエイトリンクへ。
  // まだアフィリエイトリンク未発行のサイトは、出典元の引用ブログ(sourceUrl)ではなく
  // サイト本体のトップページ(SITE_HOMEPAGES)を暫定的に使う。
  // 自社の案件詳細ページ(履歴グラフ付き)へは、各行のポイント数クリックから移動する。
  const bestOffer = offers[0];
  const bestClickUrl = bestOffer
    ? buildDeepAffiliateUrl(bestOffer) ||
      bestOffer.mediaAffiliateUrl ||
      SITE_HOMEPAGES[bestOffer.siteSlug] ||
      bestOffer.sourceUrl
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
        </h2>
        {campaign.aiResearched && <span className="badge badge-ai">AI調査</span>}
      </div>
      {offers.length > 1 && (
        <div className="sort-toggle" role="group" aria-label="並び替え">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`sort-toggle-btn${sortKey === opt.key ? " is-active" : ""}`}
              onClick={() => setSortKey(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      <div className="offer-list">
        {sortedOffers.map((offer) => {
          const originalIndex = offers.indexOf(offer);
          return (
            <OfferRow
              key={offer.siteSlug || originalIndex}
              offer={offer}
              isTop={originalIndex === 0}
              rank={originalIndex + 1}
            />
          );
        })}
      </div>
      {campaign.aiNote && <p className="ai-note">{campaign.aiNote}</p>}
      <a href={`/campaigns/${campaign.id}`} className="offer-source-link campaign-detail-link">
        還元額の推移を見る ›
      </a>
    </div>
  );
}
