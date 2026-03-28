"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, Clock, MessageCircle, Shield, Sparkles } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { cn } from "@/lib/utils";

const LINE_URL = "https://lin.ee/vhrzGg7";
const TITLE_FONT = "font-serif font-bold tracking-tight";

const PLANS = [
  {
    key: "light",
    name: "ライト",
    price: "980",
    features: [
      { text: "ミシェルAI相談し放題", included: true },
      { text: "あなた専用の記憶", included: true },
      { text: "人物MAP", included: true },
      { text: "仁さんに相談", included: false },
    ],
    cta: "ライトで始める",
  },
  {
    key: "standard",
    name: "スタンダード",
    price: "1,980",
    badge: "いちばん人気",
    featured: true,
    features: [
      { text: "ミシェルAI相談し放題", included: true },
      { text: "あなた専用の記憶", included: true },
      { text: "人物MAP", included: true },
      { text: "仁さんに相談（月10回）", included: true },
    ],
    cta: "スタンダードで始める",
  },
  {
    key: "premium",
    name: "プレミアム",
    price: "2,980",
    features: [
      { text: "ミシェルAI相談し放題", included: true },
      { text: "あなた専用の記憶", included: true },
      { text: "人物MAP", included: true },
      { text: "仁さんに相談（月20回）", included: true },
    ],
    cta: "プレミアムで始める",
  },
];

export function MichelleLpClient() {
  const revealRefs = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).style.opacity = "1";
            (e.target as HTMLElement).style.transform = "translateY(0)";
          }
        });
      },
      { threshold: 0.1 }
    );
    revealRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const addRevealRef = (el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) {
      el.style.opacity = "0";
      el.style.transform = "translateY(24px)";
      el.style.transition = "opacity 0.7s ease, transform 0.7s ease";
      revealRefs.current.push(el);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* ===== Hero ===== */}
      <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden">
        <video
          className="absolute inset-0 hidden h-full w-full object-cover md:block"
          autoPlay muted loop playsInline
          poster="/michelle-lp/landscape.png"
        >
          <source src="/michelle-lp/hero-16x9.mp4" type="video/mp4" />
        </video>
        <video
          className="absolute inset-0 block h-full w-full object-cover md:hidden"
          autoPlay muted loop playsInline
          poster="/michelle-lp/portrait.png"
        >
          <source src="/michelle-lp/hero-9x16.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[#5f3b1f]/40" />
        <div className="relative z-10 mx-auto max-w-2xl px-6 py-24 text-center text-white">
          <p className="text-xs font-semibold tracking-[0.4em] opacity-90">
            テープ式心理学 × AI
          </p>
          <h1 className={cn("mt-4 text-4xl leading-tight md:text-5xl", TITLE_FONT)}>
            心が苦しいとき、
            <br />
            <span className="text-[#ffe3c7]">ミシェルに話して。</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed opacity-90 md:text-lg">
            24時間365日。あなたの隣に、AIカウンセラー。
          </p>
          <div className="mt-8">
            <a
              href={LINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#d59da9] px-8 py-4 text-base font-bold text-white shadow-lg shadow-[#d59da9]/30 transition hover:-translate-y-0.5 hover:bg-[#ce94a0]"
            >
              今すぐ無料で始める
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </div>
      </section>

      {/* ===== Chapter 1: テープ式心理学とは？ ===== */}
      <section ref={addRevealRef} className="px-4 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <SectionLabel>CHAPTER 1</SectionLabel>
          <h2 className={cn("mt-2 text-3xl text-[#51433c] md:text-4xl", TITLE_FONT)}>
            テープ式心理学って何？
          </h2>
          <p className="mt-3 text-sm text-[#8b7a71]">
            心の苦しみの正体を、やさしく紐解いていきます。
          </p>

          <div className="mt-10 grid gap-0 overflow-hidden rounded-4xl border border-[#f0e4d8] bg-white/90 shadow-[0_18px_38px_rgba(81,67,60,0.07)] md:grid-cols-2">
            <div className="relative min-h-[240px] md:min-h-0">
              <video
                className="absolute inset-0 h-full w-full object-cover"
                autoPlay muted loop playsInline
                poster="/michelle-lp/counseling.png"
              >
                <source src="/michelle-lp/tape.mp4" type="video/mp4" />
              </video>
            </div>
            <div className="p-6 md:p-8">
              <h3 className={cn("text-xl text-[#51433c] md:text-2xl", TITLE_FONT)}>
                「テープ」＝心に貼り付いた思い込みのことば
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-[#8b7a71]">
                「どうせ私はダメ」「愛されるわけない」──これらは幼い頃から心に貼られたテープの言葉。
              </p>

              <h4 className={cn("mt-6 text-base text-[#d59da9]", TITLE_FONT)}>
                テープが感情を自動起動する
              </h4>
              <div className="mt-2 rounded-2xl border border-[#ffe3c7] bg-[#fff5ea] px-4 py-3">
                <p className="text-sm text-[#b06a3b]">
                  誰かに怒られる → テープ再生 → 「やっぱり私はダメ」
                </p>
              </div>

              <h4 className={cn("mt-6 text-base text-[#51433c]", TITLE_FONT)}>
                テープを貼り替えると人生が変わる
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-[#8b7a71]">
                古いテープを認識して、新しい言葉に貼り替えていく——それがテープ式心理学。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Chapter 2: 心の苦しみには必ずゴールがある ===== */}
      <section ref={addRevealRef} className="relative flex min-h-[80vh] items-center justify-center overflow-hidden">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay muted loop playsInline
          poster="/michelle-lp/tunnel.png"
        >
          <source src="/michelle-lp/tunnel.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[#5f3b1f]/50" />
        <div className="relative z-10 mx-auto max-w-3xl px-6 py-20 text-center text-white">
          <SectionLabel className="text-white/70">CHAPTER 2</SectionLabel>
          <p className="mt-4 text-sm opacity-90">どんな苦しみにも</p>
          <h2 className={cn("mt-2 text-4xl text-[#ffe3c7] md:text-5xl", TITLE_FONT)}>
            ゴールがある
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-sm leading-loose opacity-90 md:text-base">
            どんなに暗いトンネルでも必ず出口がある。苦しみは永遠じゃない。
            テープ式心理学では、「終わり」を最初に見せる。
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { num: "01", title: "苦しみには原因がある", desc: "テープが特定できる" },
              { num: "02", title: "変えられる", desc: "テープは貼り替えられる" },
              { num: "03", title: "ゴールが見える", desc: "あなたに合った処方箋" },
            ].map((card) => (
              <div
                key={card.num}
                className="rounded-3xl border border-white/20 bg-white/95 p-5 text-center shadow-[0_12px_30px_rgba(81,67,60,0.08)] backdrop-blur-sm"
              >
                <span className={cn("text-2xl text-[#d59da9]", TITLE_FONT)}>
                  {card.num}
                </span>
                <h4 className="mt-2 text-sm font-bold text-[#51433c]">
                  {card.title}
                </h4>
                <p className="mt-1 text-xs text-[#8b7a71]">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Chapter 3: ミシェルAI ===== */}
      <section ref={addRevealRef} className="px-4 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <SectionLabel>CHAPTER 3</SectionLabel>
          <h2 className={cn("mt-2 text-3xl text-[#51433c] md:text-4xl", TITLE_FONT)}>
            気軽に話せるAI、ミシェル
          </h2>

          {/* ミシェル紹介バナー */}
          <div className="mt-8 rounded-4xl border border-[#f0e4d8] bg-gradient-to-r from-[#fdf1f4] via-[#fff5f8] to-[#fef7f5] p-6 text-center shadow-[0_18px_38px_rgba(81,67,60,0.07)] md:p-8">
            <Image
              src="/michelle-icon.png"
              alt="ミシェル"
              width={72}
              height={72}
              className="mx-auto rounded-full shadow-md"
            />
            <h3 className={cn("mt-4 text-2xl text-[#51433c]", TITLE_FONT)}>
              ミシェル
            </h3>
            <p className="mt-1 text-sm text-[#8b7a71]">
              テープ式心理学AIカウンセラー
            </p>
            <div className="mx-auto mt-4 inline-block rounded-full border border-[#f0e4d8] bg-white px-6 py-3">
              <p className="text-sm text-[#51433c]">
                どんな時でも、あなたの話を聞くために ここにいるよ。
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* 左: 特徴リスト */}
            <div className="rounded-4xl border border-[#f0e4d8] bg-white/90 p-6 shadow-[0_18px_38px_rgba(81,67,60,0.07)]">
              <h4 className="mb-4 text-sm font-semibold text-[#b29f95]">
                ミシェルはこんなAI
              </h4>
              <div className="space-y-4">
                {[
                  { icon: Clock, title: "深夜でも即レス", desc: "2時でも3時でも。眠れない夜に、隣にいる。" },
                  { icon: Sparkles, title: "テープ式心理学で応答", desc: "あなたのテープを優しく見つけてくれる。" },
                  { icon: Shield, title: "誰にも知られない", desc: "友達や家族に言えないことも、話せる。" },
                  { icon: MessageCircle, title: "感情日記と連携", desc: "毎日の気持ちを記録して、パターンを発見。" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#fdf1f4] text-[#d59da9]">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#51433c]">{item.title}</p>
                      <p className="text-xs text-[#8b7a71]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 右: 動画 + 会話サンプル */}
            <div className="overflow-hidden rounded-4xl border border-[#f0e4d8] bg-white/90 shadow-[0_18px_38px_rgba(81,67,60,0.07)]">
              <video
                className="aspect-video w-full object-cover"
                autoPlay muted loop playsInline
                poster="/michelle-lp/landscape.png"
              >
                <source src="/michelle-lp/hero-16x9.mp4" type="video/mp4" />
              </video>
              <div className="space-y-2 p-5">
                <ChatBubble side="left">
                  なんか最近ずっと疲れてて…理由もわからないんだけど。
                </ChatBubble>
                <ChatBubble side="right">
                  そうか、ずっと疲れてるんだね。どんな時に特にしんどくなる？
                </ChatBubble>
                <ChatBubble side="left">
                  誰かに頼まれると断れなくて…
                </ChatBubble>
                <ChatBubble side="right">
                  断れない…それって「役に立たないと嫌われる」というテープかも
                </ChatBubble>
              </div>
            </div>
          </div>

          {/* LINE CTA */}
          <div className="mt-10 text-center">
            <a
              href={LINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 rounded-full bg-[#06C755] px-8 py-4 text-base font-bold text-white shadow-lg shadow-[#06C755]/25 transition hover:-translate-y-0.5 hover:bg-[#05b64c]"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              LINEで友だち追加して始める
            </a>
            <p className="mt-3 text-xs text-[#8b7a71]">
              友だち追加するだけですぐに話せます
            </p>
          </div>
        </div>
      </section>

      {/* ===== Chapter 4: 7日間無料 ===== */}
      <section
        ref={addRevealRef}
        className="border-y border-[#f0e4d8] bg-gradient-to-r from-[#fdf1f4] via-[#fff5f8] to-[#fef7f5] px-4 py-20 md:py-28"
      >
        <div className="mx-auto max-w-3xl text-center">
          <SectionLabel>CHAPTER 4</SectionLabel>
          <h2 className={cn("mt-2 text-3xl text-[#51433c] md:text-4xl", TITLE_FONT)}>
            まずは7日間、無料で体験
          </h2>

          <div className="mx-auto mt-8 inline-flex items-center gap-2 rounded-full bg-[#d59da9] px-6 py-3 text-lg font-bold text-white shadow-lg shadow-[#d59da9]/25">
            <Sparkles className="h-5 w-5" />
            7日間 完全無料
          </div>

          <p className="mt-6 text-sm text-[#8b7a71]">
            クレジットカード不要。いつでもキャンセルOK。
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-4">
            {[
              { num: "1", text: "無料登録（30秒）" },
              { num: "2", text: "ミシェルと会話スタート" },
              { num: "3", text: "感情日記をつける" },
              { num: "4", text: "7日後にプランを選ぶ" },
            ].map((step) => (
              <div
                key={step.num}
                className="rounded-3xl border border-[#f0e4d8] bg-white/95 p-5 text-center shadow-[0_12px_30px_rgba(81,67,60,0.08)]"
              >
                <span className={cn("text-2xl text-[#d59da9]", TITLE_FONT)}>
                  {step.num}
                </span>
                <p className="mt-2 text-sm text-[#51433c]">{step.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <a
              href={LINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#d59da9] px-8 py-4 text-base font-bold text-white shadow-lg shadow-[#d59da9]/30 transition hover:-translate-y-0.5 hover:bg-[#ce94a0]"
            >
              今すぐ無料で始める
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </div>
      </section>

      {/* ===== Chapter 5: プラン ===== */}
      <section ref={addRevealRef} className="px-4 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <SectionLabel>CHAPTER 5</SectionLabel>
            <h2 className={cn("mt-2 text-3xl text-[#51433c] md:text-4xl", TITLE_FONT)}>
              プランを選ぼう
            </h2>
            <p className="mt-3 text-sm text-[#8b7a71]">
              7日間の無料体験後、続けたいプランを選択
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.key}
                className={cn(
                  "relative rounded-4xl border-2 p-6 transition-all",
                  plan.featured
                    ? "border-[#d59da9] bg-gradient-to-b from-[#fdf1f4] to-white shadow-lg shadow-[#d59da9]/10"
                    : "border-[#f0e4d8] bg-white/90 shadow-[0_18px_38px_rgba(81,67,60,0.07)]"
                )}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#d59da9] px-4 py-1 text-xs font-bold text-white">
                    {plan.badge}
                  </span>
                )}
                <p className="text-[10px] font-semibold text-[#d59da9]">7日間無料</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className={cn("text-3xl text-[#51433c]", TITLE_FONT)}>
                    ¥{plan.price}
                  </span>
                  <span className="text-sm text-[#8b7a71]">/月</span>
                </div>
                <p className="mt-1 text-sm font-bold text-[#51433c]">{plan.name}</p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2 text-sm">
                      {f.included ? (
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#d59da9]" />
                      ) : (
                        <span className="mt-0.5 inline-block h-4 w-4 flex-shrink-0 text-center text-[#ccc]">
                          —
                        </span>
                      )}
                      <span className={f.included ? "text-[#51433c]" : "text-[#bbb]"}>
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/michelle/subscribe"
                  className={cn(
                    "mt-6 block rounded-full py-3 text-center text-sm font-bold transition hover:-translate-y-0.5",
                    plan.featured
                      ? "bg-[#d59da9] text-white shadow-lg shadow-[#d59da9]/25 hover:bg-[#ce94a0]"
                      : "border border-[#f0e4d8] bg-white text-[#51433c] hover:bg-[#fff6ed]"
                  )}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-[#8b7a71]">
            ※ 7日間無料体験後に料金が発生します。いつでもキャンセル可能。
          </p>

          {/* かんじょうにっきリンク */}
          <div className="mt-10 rounded-3xl border border-[#f0e4d8] bg-white/80 p-6 text-center">
            <p className="text-sm text-[#8b7a71]">
              ミシェルAIは「かんじょうにっき」のサービスのひとつです
            </p>
            <Link
              href="/"
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#d59da9] hover:underline"
            >
              かんじょうにっきトップへ
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-xs font-semibold uppercase tracking-[0.4em] text-[#b29f95]", className)}>
      {children}
    </p>
  );
}

function ChatBubble({ children, side }: { children: React.ReactNode; side: "left" | "right" }) {
  return side === "left" ? (
    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[#fff5ea] px-4 py-3">
      <p className="text-sm text-[#51433c]">{children}</p>
    </div>
  ) : (
    <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#d59da9] px-4 py-3">
      <p className="text-sm text-white">{children}</p>
    </div>
  );
}
