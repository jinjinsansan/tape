import Link from "next/link";
import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Radio, PlayCircle, Video, MessageCircle, HelpCircle, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "ライブ勉強会 | かんじょうにっき",
  description: "毎週月曜20時に配信しているテープ式心理学ライブ勉強会の案内ページです。視聴方法や質問方法、通知設定などをご案内します。"
};

const WEBINAR_ID = "814 6077 1426";
const WEBINAR_PASSCODE = "825842";

export default function LivePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:py-16">
      <section className="space-y-6 rounded-[32px] border border-[#f0e4d8] bg-gradient-to-br from-[#fffdf9] via-[#fff5ea] to-[#ffe6d4] p-8 text-center shadow-[0_25px_60px_rgba(81,67,60,0.08)]">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-[#b06a3b]">
          <Radio className="h-4 w-4" /> LIVE
        </div>
        <p className="text-sm font-semibold text-[#b06a3b]">毎週月曜日 20:00｜無料ライブ勉強会</p>
        <h1 className="text-3xl font-semibold text-[#4b362c] md:text-4xl">
          テープ式心理学を“実例で”学べます（質問もOK）
        </h1>
        <p className="text-base text-[#7c665b]">
          NAMIDAサポート協会の心理カウンセラーが交代で登壇し、最新のケーススタディやセルフケアのコツを共有します。初心者の方でも安心して参加できる無料のオンライン勉強会です。
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="https://www.youtube.com/@namisapo/streams"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#e53564] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#e53564]/40 transition hover:-translate-y-0.5"
          >
            <PlayCircle className="h-4 w-4" /> YouTubeで視聴
          </Link>
          <Link
            href="https://us06web.zoom.us/j/81460771426?pwd=2hkrCPmEN0IGWIWfNNetgwnl-nglFA.P9ncBpNEtbwnQeaj"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[#f0e4d8] bg-white px-5 py-3 text-sm font-semibold text-[#4b362c] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff7ef]"
          >
            <Video className="h-4 w-4" /> Zoomで視聴
          </Link>
        </div>
      </section>

      <div className="mt-10 space-y-8">
        <Card className="border-[#f0e4d8] bg-white/90">
          <CardContent className="space-y-4 p-6">
            <h2 className="text-xl font-semibold text-[#4b362c]">目的</h2>
            <p className="text-sm text-[#7c665b]">
              テープ式心理学は一般的な心理学・精神医学とは異なる独自の理論です。はじめての方でも要点が掴めるよう、無料でわかりやすく解説しながらライブ中に視聴者からの質問にもお答えしています。
            </p>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-[#4b362c]">視聴方法</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-[#f0e4d8]">
              <CardContent className="space-y-3 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#b06a3b]">方法 1</p>
                <h3 className="text-lg font-semibold text-[#4b362c]">YouTubeライブ</h3>
                <p className="text-sm text-[#7c665b]">ブラウザやアプリから気軽に視聴できます。アーカイブ一覧から過去の配信も振り返れます。</p>
                <Link
                  href="https://www.youtube.com/@namisapo/streams"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#b06a3b]"
                >
                  ライブ一覧を見る
                  <PlayCircle className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
            <Card className="border-[#f0e4d8]">
              <CardContent className="space-y-3 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#b06a3b]">方法 2</p>
                <h3 className="text-lg font-semibold text-[#4b362c]">Zoomで参加</h3>
                <p className="text-sm text-[#7c665b]">質問しやすい雰囲気で参加したい方はこちら。Q&A機能を使って匿名でも投稿できます。</p>
                <div className="rounded-2xl bg-[#fff7ef] p-4 text-sm text-[#4b362c]">
                  <p>ウェビナーID：{WEBINAR_ID}</p>
                  <p>パスコード：{WEBINAR_PASSCODE}</p>
                </div>
                <Link
                  href="https://us06web.zoom.us/j/81460771426?pwd=2hkrCPmEN0IGWIWfNNetgwnl-nglFA.P9ncBpNEtbwnQeaj"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#b06a3b]"
                >
                  Zoomで参加する
                  <Video className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        <Card className="border-[#f0e4d8]">
          <CardContent className="space-y-3 p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#fff5ea] px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-[#b06a3b]">
              <HelpCircle className="h-4 w-4" /> 質問方法
            </div>
            <p className="text-sm text-[#7c665b]">
              ライブ中は <strong>ZoomのQ&Aボタン</strong> または <strong>YouTubeのコメント欄</strong> から質問を送っていただけます。担当カウンセラーが順番に回答します（時間によっては回答できない場合もございます）。
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#f0e4d8] bg-[#f8fff4]">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#2a7f3d]">通知</p>
              <h3 className="text-lg font-semibold text-[#2a7f3d]">公式LINEでライブ通知を受け取る</h3>
              <p className="text-sm text-[#4b6b55]">開催直前のリマインドや中止連絡を受け取れます。登録は無料です。</p>
            </div>
            <Link
              href="https://lin.ee/9COoDiF"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#06C755] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#06C755]/30"
            >
              <MessageCircle className="h-4 w-4" /> LINEに登録する
            </Link>
          </CardContent>
        </Card>

        <Card className="border-[#f0e4d8]">
          <CardContent className="space-y-3 p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#fff5ea] px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-[#b06a3b]">
              <Sparkles className="h-4 w-4" /> 得られる効果
            </div>
            <p className="text-sm text-[#7c665b]">
              テープ式心理学は「気づき」をもたらす学びです。ライブ勉強会では日常の悩みを別の角度から捉え直すヒントや、すぐに試せるセルフワークを紹介します。毎週参加することで理解が深まり、自分自身の変化に気づきやすくなります。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
