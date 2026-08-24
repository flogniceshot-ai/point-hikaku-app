import "./globals.css";

export const metadata = {
  title: "ポイ活ナビ | ポイントサイト横断比較",
  description: "複数のポイントサイトの還元額を横断検索して比較できます。",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
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
