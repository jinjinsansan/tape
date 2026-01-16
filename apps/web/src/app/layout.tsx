import type { Metadata } from "next";
import { Zen_Maru_Gothic, Shippori_Mincho } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { SITE_NAME_JP } from "@/lib/branding";

const zenMaru = Zen_Maru_Gothic({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-zen-maru",
  display: "swap",
});

const shipporiMincho = Shippori_Mincho({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-shippori",
  display: "swap",
});

export const metadata: Metadata = {
  title: SITE_NAME_JP,
  description: "心に寄り添う、やさしい場所",
  applicationName: SITE_NAME_JP,
  manifest: "/manifest.json",
  themeColor: "#F6EFEA",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME_JP,
    statusBarStyle: "default"
  }
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
          "min-h-screen font-sans text-tape-brown antialiased flex flex-col",
          zenMaru.variable,
          shipporiMincho.variable
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
