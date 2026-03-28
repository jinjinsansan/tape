import type { Metadata } from "next";
import { ForBusinessClient } from "./lp-client";

export const metadata: Metadata = {
  title: "AIカウンセリングシステム導入支援 | かんじょうにっき",
  description:
    "占い師・心理カウンセラー・コーチング事業者向けに、あなたのメソッドを学習したAIカウンセリングシステムをカスタム開発・納品します。",
  openGraph: {
    title: "AIカウンセリングシステム導入支援 | かんじょうにっき",
    description:
      "あなたのサービスに24時間対応のAIを。占い師・カウンセラー・コーチ向けAIシステム構築。",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AIカウンセリングシステム導入支援 | かんじょうにっき",
    description:
      "あなたのサービスに24時間対応のAIを。占い師・カウンセラー・コーチ向けAIシステム構築。",
  },
};

export default function Page() {
  return <ForBusinessClient />;
}
