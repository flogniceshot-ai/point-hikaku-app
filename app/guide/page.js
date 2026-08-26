import { SITE_GUIDES } from "../../lib/siteGuides";
import { SITE_NAME, SITE_URL } from "../../lib/site";

export const metadata = {
  title: "ポイントサイト解説一覧",
  description: "モッピー・ハピタス・ちょびリッチなど主要ポイントサイトの特徴・還元率・ポイント交換先をサイトごとに解説します。",
  alternates: { canonical: `${SITE_URL}/guide` },
};

export default function GuideIndexPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "サイト解説", item: `${SITE_URL}/guide` },
    ],
  };

  return (
    <div className="legal-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <a href="/" className="back-link">
        ← 検索に戻る
      </a>
      <h1>ポイントサイト解説一覧</h1>
      <p className="legal-updated">
        {SITE_NAME}で比較対象としている主要ポイントサイトの、運営会社・ポイントレート・交換先・特徴をサイトごとにまとめています。
      </p>

      <h2>サイト一覧</h2>
      <ul>
        {SITE_GUIDES.map((g) => (
          <li key={g.slug}>
            <a href={`/guide/${g.slug}`}>{g.name}とは？</a> ── {g.catchphrase}
          </li>
        ))}
      </ul>

      <h2>関連ページ</h2>
      <p>
        <a href="/">トップページで案件を検索する</a>
      </p>
    </div>
  );
}
