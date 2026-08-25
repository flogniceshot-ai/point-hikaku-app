import { SITE_NAME, SITE_URL } from "../../lib/site";

const title = `お問い合わせ | ${SITE_NAME}`;
const description =
  "ポイ活ナビへのお問い合わせはこちらから。掲載内容の誤りのご指摘、掲載・提携のご相談、サイトの不具合報告などを受け付けています。";
const url = `${SITE_URL}/contact`;

export const metadata = {
  title,
  description,
  alternates: { canonical: url },
  openGraph: { title, description, url, siteName: SITE_NAME, locale: "ja_JP", type: "website" },
  twitter: { card: "summary", title, description },
};

export default function ContactLayout({ children }) {
  return children;
}
