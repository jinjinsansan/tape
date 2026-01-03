import type { Metadata } from "next";
import { Zen_Maru_Gothic } from "next/font/google";
import "../globals.css";
import { cn } from "@/lib/utils";

const zenMaru = Zen_Maru_Gothic({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-zen-maru",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tape - 心の痛みを言葉にして、本当の自分と出会う",
  description: "感情日記、AIカウンセリング、専門的な動画コース。Tape式心理学があなたの内面の成長を、やさしくサポートします。",
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
