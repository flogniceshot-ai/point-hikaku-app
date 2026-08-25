import Script from "next/script";
import "./globals.css";
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION, GA_MEASUREMENT_ID } from "../lib/site";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | ポイントサイト横断比較`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: `${SITE_NAME} | ポイントサイト横断比較`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} | ポイントサイト横断比較`,
    description: SITE_DESCRIPTION,
  },
  verification: {
    google: "JLch6Qsksp4N4s6Ks54XyuQcQAmJbXvxCXJysD9D02c",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: "ja",
    },
    {
      "@type": "Organization",
      name: `${SITE_NAME}運営事務局`,
      url: SITE_URL,
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        {/* ステルスマーケティング規制(景品表示法)対応: ファーストビューで
            アフィリエイト広告であることを明示する */}
        <div className="pr-banner">
          本サイトはアフィリエイト広告を利用しています(PR)。
          <a href="/about">詳しくはこちら</a>
        </div>
        <header className="site-header">
          <div className="site-header-inner">
            <a href="/" className="site-logo">
              ポイ活ナビ
            </a>
            <span className="site-tagline">ポイントサイト横断比較検索</span>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          <div className="site-footer-inner">
            <nav className="site-footer-nav">
              <a href="/about">運営者情報</a>
              <a href="/privacy">プライバシーポリシー</a>
              <a href="/terms">利用規約</a>
              <a href="/contact">お問い合わせ</a>
            </nav>
            <p className="site-footer-copy">© {new Date().getFullYear()} ポイ活ナビ運営事務局</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
