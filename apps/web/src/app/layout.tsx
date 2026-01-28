import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { SITE_NAME_JP } from "@/lib/branding";

const zenMaru = localFont({
  src: [
    { path: "../fonts/zen-maru-gothic-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/zen-maru-gothic-700.woff2", weight: "700", style: "normal" }
  ],
  variable: "--font-zen-maru",
  display: "swap"
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
