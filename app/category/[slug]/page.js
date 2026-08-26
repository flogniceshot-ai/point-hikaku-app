import { notFound } from "next/navigation";
import { searchCampaigns, usingRealDatabase, DATA_NOTE } from "../../../lib/db";
import { CATEGORIES, getCategory, filterCampaignsByCategory } from "../../../lib/categories";
import { SITE_NAME, SITE_URL } from "../../../lib/site";
import CampaignCard from "../../components/CampaignCard";

export async function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) {
    return { title: "カテゴリが見つかりません" };
  }

  const pageTitle = `${category.name}のポイ活案件一覧`;
  const fullTitle = `${pageTitle} | ${SITE_NAME}`;
  const url = `${SITE_URL}/category/${slug}`;

  return {
    title: pageTitle,
    description: category.description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description: category.description,
      url,
      siteName: SITE_NAME,
      locale: "ja_JP",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: fullTitle,
      description: category.description,
    },
  };
}

// カテゴリ内の並び順: 円換算した還元額(rate案件はそのまま%)が高い順。
function bestYenValue(campaign) {
  const offers = campaign.offers || [];
  if (offers.length === 0) return -1;
  const top = offers[0];
  if (campaign.rewardType === "rate") return top.value;
  return top.value * (top.pointRate ?? 1);
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) {
    notFound();
  }

  const allCampaigns = await searchCampaigns("");
  const campaigns = filterCampaignsByCategory(allCampaigns, slug).sort(
    (a, b) => bestYenValue(b) - bestYenValue(a)
  );

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: category.name, item: `${SITE_URL}/category/${slug}` },
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
      <h1 className="detail-title">{category.name}のポイ活案件一覧</h1>
      <p className="search-hint">{category.description}</p>

      <div className="chip-row">
        {CATEGORIES.filter((c) => c.slug !== slug).map((c) => (
          <a key={c.slug} href={`/category/${c.slug}`} className="chip">
            {c.name}
          </a>
        ))}
      </div>

      {campaigns.length === 0 ? (
        <div className="empty-state">このカテゴリの案件はまだ登録されていません。</div>
      ) : (
        <div>
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}

      {!usingRealDatabase && <p className="data-note">{DATA_NOTE}</p>}
    </>
  );
}
