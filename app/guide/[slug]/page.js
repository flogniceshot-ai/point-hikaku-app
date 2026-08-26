import { notFound } from "next/navigation";
import { SITE_GUIDES, getSiteGuide } from "../../../lib/siteGuides";
import { SITE_HOMEPAGES } from "../../../lib/siteHomepages";
import { SITE_NAME, SITE_URL } from "../../../lib/site";

export async function generateStaticParams() {
  return SITE_GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const guide = getSiteGuide(slug);
  if (!guide) {
    return { title: "サイトが見つかりません" };
  }

  const pageTitle = `${guide.name}とは？特徴・還元率・ポイント交換先まとめ`;
  const description = `${guide.name}(運営: ${guide.operator})の特徴・ポイントレート・交換先・評判をまとめて解説。${SITE_NAME}では${guide.name}を含む複数サイトの還元額を横断比較できます。`;
  const fullTitle = `${pageTitle} | ${SITE_NAME}`;
  const url = `${SITE_URL}/guide/${slug}`;

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
      type: "article",
    },
    twitter: {
      card: "summary",
      title: fullTitle,
      description,
    },
  };
}

export default async function SiteGuidePage({ params }) {
  const { slug } = await params;
  const guide = getSiteGuide(slug);
  if (!guide) {
    notFound();
  }

  const homepage = SITE_HOMEPAGES[guide.siteSlug];
  const url = `${SITE_URL}/guide/${slug}`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "サイト解説", item: `${SITE_URL}/guide` },
      { "@type": "ListItem", position: 3, name: guide.name, item: url },
    ],
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${guide.name}とは？特徴・還元率・ポイント交換先まとめ`,
    description: guide.catchphrase,
    url,
    inLanguage: "ja",
    publisher: { "@type": "Organization", name: `${SITE_NAME}運営事務局` },
  };

  return (
    <div className="legal-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <a href="/guide" className="back-link">
        ← サイト解説一覧に戻る
      </a>
      <h1>{guide.name}とは？特徴・還元率・ポイント交換先まとめ</h1>
      <p className="legal-updated">{guide.catchphrase}</p>

      <h2>運営会社・サービス概要</h2>
      <p>
        {guide.name}の運営会社は{guide.operator}です。サービス開始は{guide.founded}
        で、{guide.members}とされています。
      </p>
      {guide.operatorNote && <p>{guide.operatorNote}</p>}

      <h2>ポイントレート・交換先</h2>
      <p>ポイント単位は「{guide.pointRate}」です。{guide.exchangeTargets}</p>
      <p>
        最低交換ポイント数の目安は{guide.minExchange}です。{guide.feeNote}
      </p>

      <h2>特徴・強み</h2>
      <ul>
        {guide.strengths.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>

      <h2>利用時の注意点</h2>
      <p>{guide.caution}</p>

      <h2>{guide.name}の案件を比較する</h2>
      <p>
        {SITE_NAME}では、{guide.name}を含む複数のポイントサイトで同じ案件(クレジットカード発行・ショッピング・アンケートなど)の還元額を横断比較できます。
        <a href="/">トップページの検索</a>から気になる案件名で検索してみてください。
      </p>
      {homepage && (
        <p>
          <a href={homepage} target="_blank" rel="noopener noreferrer nofollow">
            {guide.name}の公式サイトはこちら
          </a>
        </p>
      )}

      <h2>関連ページ</h2>
      <p>
        <a href="/guide">他のサイト解説を見る</a> ／ <a href="/">トップページで案件を検索する</a>
      </p>
    </div>
  );
}
