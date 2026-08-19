import "./globals.css";

export const metadata = {
  title: "ポイ活ナビ | ポイントサイト横断比較",
  description: "複数のポイントサイトの還元額を横断検索して比較できます。",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <a href="/" className="site-logo">
              ポイ活ナビ
            </a>
            <span className="site-tagline">ポイントサイト横断比較検索</span>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
