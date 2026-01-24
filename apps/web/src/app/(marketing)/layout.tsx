import type { Metadata } from "next";
import localFont from "next/font/local";
import "../globals.css";
import { cn } from "@/lib/utils";

const zenMaru = localFont({
  src: [
    { path: "../../fonts/zen-maru-gothic-300.woff2", weight: "300", style: "normal" },
    { path: "../../fonts/zen-maru-gothic-400.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/zen-maru-gothic-500.woff2", weight: "500", style: "normal" },
    { path: "../../fonts/zen-maru-gothic-700.woff2", weight: "700", style: "normal" }
  ],
  variable: "--font-zen-maru",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Tape - 心の痛みを言葉にして、本当の自分と出会う",
  description: "感情日記、AIカウンセリング、専門的な動画コース。テープ式心理学があなたの内面の成長を、やさしくサポートします。",
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={cn(
          "min-h-screen font-sans text-tape-brown antialiased",
          zenMaru.variable
        )}
      >
        {children}
      </body>
    </html>
  );
}
