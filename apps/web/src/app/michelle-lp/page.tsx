import type { Metadata } from "next";
import { MichelleLpClient } from "./lp-client";

export const metadata: Metadata = {
  title: "ミシェルAI | テープ式心理学AIカウンセラー",
  description:
    "テープ式心理学に基づくAI心理カウンセラー「ミシェル」。24時間いつでもLINEで相談できます。心の苦しみには必ずゴールがあります。まずは7日間無料でお試しください。",
  openGraph: {
    title: "ミシェルAI | テープ式心理学AIカウンセラー",
    description:
      "24時間いつでもLINEで相談。テープ式心理学に基づくAIが、あなたの心に寄り添います。7日間無料。",
    type: "website",
    images: [{ url: "/michelle-lp/og-square.png", width: 1024, height: 1024 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ミシェルAI | テープ式心理学AIカウンセラー",
    description:
      "24時間いつでもLINEで相談。テープ式心理学に基づくAIが、あなたの心に寄り添います。7日間無料。",
    images: ["/michelle-lp/og-square.png"],
  },
};

export default function Page() {
  return <MichelleLpClient />;
}
