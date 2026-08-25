"use client";

import { useState } from "react";
import { SITE_HOMEPAGES, getSiteFaviconUrl } from "../../lib/siteHomepages";

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

export default function OfferRow({ offer, isTop, rank }) {
  const isRate = offer.value != null && offer.value < 100;
  // ポイント数はサイトごとに交換レートが違う(例: ECナビは10pt=1円)ため、
  // そのままでは他サイトと比較できない。pointRateを掛けた円換算額を併記する。
  const pointRate = offer.pointRate ?? 1;
  const yenValue = !isRate && offer.value != null ? Math.round(offer.value * pointRate) : null;
  const showRawPoints = yenValue != null && pointRate !== 1;
  const fetched = formatFetchedAt(offer.fetchedAt);
  const [logoError, setLogoError] = useState(false);
  // メディア名・還元額どちらのリンク先も、本来はASP発行のアフィリエイトリンク(mediaAffiliateUrl)に統一する。
  // 以前は還元額側だけ出典元ページ(sourceUrl)に飛ばしていたため、最も目立つ数字をクリックしても
  // アフィリエイト計測されないケースがあった(会員登録が発生してもポイ活ナビ経由と計測されない)。
  // まだアフィリエイトリンク未発行のサイトは、出典元の引用ブログではなく、
  // サイト本体のトップページ(SITE_HOMEPAGES)を暫定的に使う。
  const clickUrl = offer.mediaAffiliateUrl || SITE_HOMEPAGES[offer.siteSlug] || offer.sourceUrl;
  const faviconUrl = getSiteFaviconUrl(offer.siteSlug);
  const siteNameContent = (
    <>
      {faviconUrl && !logoError ? (
        <img
          src={faviconUrl}
          alt=""
          className="offer-site-logo"
          width={16}
          height={16}
          onError={() => setLogoError(true)}
        />
      ) : (
        <span className="site-dot" style={{ background: offer.colorHex || "#999" }} />
      )}
      {offer.site}
    </>
  );
  return (
    <div className={`offer-row${isTop ? " is-top" : ""}`}>
      {rank != null && <span className="offer-rank">{String(rank).padStart(2, "0")}</span>}
      <span className="offer-site">
        {clickUrl ? (
          <a
            className={`offer-site-link${isTop ? " offer-site-link-cta" : ""}`}
            href={clickUrl}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            aria-label={isTop ? `${offer.site}で申し込む` : `${offer.site}へ移動`}
          >
            {siteNameContent}
            {isTop && <span className="offer-cta-label">で申し込む</span>}
            <span className="link-affordance" aria-hidden="true">
              ↗
            </span>
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
        {clickUrl ? (
          <a
            href={clickUrl}
            className="offer-value offer-value-link"
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            aria-label={`${offer.site}で申し込む`}
          >
            <span className="offer-value-main">
              {isRate ? offer.value : yenValue?.toLocaleString("ja-JP")}
              {isRate ? "%" : "円"}
            </span>
            {showRawPoints && <span className="offer-value-sub">（{offer.value.toLocaleString("ja-JP")}P）</span>}
            <span className="link-affordance link-affordance-value" aria-hidden="true">
              ↗
            </span>
          </a>
        ) : (
          <span className="offer-value">
            <span className="offer-value-main">
              {isRate ? offer.value : yenValue?.toLocaleString("ja-JP")}
              {isRate ? "%" : "円"}
            </span>
            {showRawPoints && <span className="offer-value-sub">（{offer.value.toLocaleString("ja-JP")}P）</span>}
          </span>
        )}
      </span>
    </div>
  );
}
