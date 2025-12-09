import type { Metadata } from "next";
import { Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";

const zenMaru = Zen_Maru_Gothic({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-zen-maru",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tape式心理学",
  description: "心に寄り添う、やさしい場所",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={cn(
          "min-h-screen bg-[#FFFBF5] font-sans text-[#5C554F] antialiased flex flex-col",
          zenMaru.variable
        )}
      >
        <SiteHeader />
        <div className="flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}
