// 管理画面は検索エンジンに登録させない(robots.txtのdisallowに加えた二重の防御)。
export const metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }) {
  return children;
}
