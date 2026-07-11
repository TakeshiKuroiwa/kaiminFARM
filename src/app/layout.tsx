import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "kaiminちゃんのねむり丘タウン",
  description: "眠っている間にも町が育つ、放置型町づくりシミュレーションゲーム。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
