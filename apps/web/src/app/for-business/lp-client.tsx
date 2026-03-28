"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock, TrendingDown, Zap, MessageCircle } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { cn } from "@/lib/utils";

const TITLE_FONT = "font-serif font-bold tracking-tight";

const TAGS = ["占い師", "心理カウンセラー", "コーチング", "スピリチュアル", "オンラインサロン"];

const PAIN_POINTS = [
  {
    num: "01",
    icon: Clock,
    title: "セッション外はサポートできない",
    desc: "クライアントが最も辛いのは深夜や週末。しかしあなたは24時間対応できません。",
  },
  {
    num: "02",
    icon: TrendingDown,
    title: "継続率が上がらない",
    desc: "セッションとセッションの間に何もないと、クライアントは離脱しやすくなります。",
  },
  {
    num: "03",
    icon: Zap,
    title: "スケールに限界がある",
    desc: "1人でできる人数に上限があります。AIが補助すれば、より多くの人を支えられます。",
  },
];

const SOLUTION_ITEMS = [
  {
    num: "01",
    title: "あなたの哲学・メソッドを学習",
    desc: "講義動画・テキスト・資料をもとにRAGナレッジベースを構築。AIがあなたの言葉・考え方で応答します。",
  },
  {
    num: "02",
    title: "あなたのブランドで展開",
    desc: "AIキャラクター名・デザイン・トーンはすべてカスタマイズ可能。あなたのサービスの一部として自然に溶け込みます。",
  },
  {
    num: "03",
    title: "感情日記でクライアントを可視化",
    desc: "日々の感情記録がデータに。セッション前にクライアントの状態を把握し、より深いサポートが可能になります。",
  },
  {
    num: "04",
    title: "決済からサポートまで一元管理",
    desc: "サブスクリプション課金・会員管理・AIサポートをひとつのプラットフォームで完結。運営の手間を最小化します。",
  },
];

const PACKAGES = [
  {
    icon: "🧠",
    title: "RAGナレッジベース構築",
    highlight: true,
    items: [
      "資料・動画トランスクリプト整理",
      "カテゴリ別ナレッジ分類",
      "Supabase ベクトルDB構築",
      "応答品質テスト・チューニング",
    ],
  },
  {
    icon: "💬",
    title: "AIカウンセリングチャット",
    items: [
      "AIキャラクター設定",
      "チャットUI実装",
      "感情日記機能",
      "履歴・分析ダッシュボード",
    ],
  },
  {
    icon: "👥",
    title: "会員・クライアント管理",
    items: [
      "会員登録・認証機能",
      "クライアント一覧・詳細",
      "感情データ可視化",
      "管理者ダッシュボード",
    ],
  },
  {
    icon: "💳",
    title: "決済・サブスク機能",
    items: [
      "Stripe 決済連携",
      "プラン設定・変更",
      "請求・領収書自動発行",
      "解約・停止管理",
    ],
  },
];

const FLOW_STEPS = [
  { num: "01", icon: "💬", title: "ヒアリング", desc: "サービス内容・ターゲット・ご要望をオンラインでお聞きします" },
  { num: "02", icon: "📋", title: "提案・見積", desc: "最適な構成とお見積りをご提案。ご納得いただいてから着手します" },
  { num: "03", icon: "📚", title: "素材収集・RAG構築", desc: "資料・講義をお預かりしてナレッジベースを構築します" },
  { num: "04", icon: "⚙️", title: "開発・実装", desc: "AIシステム・管理画面・決済機能を実装。テストを重ねます" },
  { num: "05", icon: "🚀", title: "納品・サポート", desc: "納品後も運用サポート・改善対応を継続して行います" },
];

const WHO_CARDS = [
  { icon: "🔮", title: "占い師・タロット師", desc: "リーディング後のフォローアップをAIが担当。クライアントとの関係を深めます。" },
  { icon: "🧠", title: "心理カウンセラー", desc: "セッション外の感情サポート・日記記録でクライアントの変化を継続的に追えます。" },
  { icon: "🎯", title: "コーチング・メンター", desc: "課題・目標の振り返りをAIがサポート。コーチングの効果を最大化します。" },
  { icon: "🌐", title: "オンラインサロン運営者", desc: "会員一人ひとりへのパーソナルサポートをスケーラブルに実現します。" },
  { icon: "✨", title: "スピリチュアル・ヒーリング系", desc: "あなたのエネルギーワーク・思想をAIに宿らせ、クライアントを24時間サポート。" },
];

export function ForBusinessClient() {
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
      el.style.transform = "translateY(22px)";
      el.style.transition = "opacity 0.7s ease, transform 0.7s ease";
      revealRefs.current.push(el);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* ===== Hero (Dark) ===== */}
      <section className="relative overflow-hidden bg-[#1a1a2e]">
        {/* Grid lines decoration */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(201,168,76,1) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#2a7a7a]/10 blur-3xl" />

        <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-2 md:items-center md:py-28">
          {/* Left column */}
          <div>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#c9a84c]/25 bg-[#c9a84c]/10 px-3 py-1 text-[11px] font-medium text-[#e8d08a]"
                >
                  {tag}
                </span>
              ))}
            </div>

            <p className="mt-6 text-xs italic tracking-[0.2em] text-[#c9a84c]" style={{ fontFamily: "serif" }}>
              AI Counseling System for Professionals
            </p>

            <h1 className={cn("mt-4 text-3xl leading-tight text-white md:text-4xl lg:text-5xl", TITLE_FONT)}>
              あなたのサービスに、
              <br />
              <span className="text-[#e8d08a]">24時間対応のAIを。</span>
            </h1>

            <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/60">
              クライアントはセッションの外でも悩んでいます。あなたの知識・哲学・メソッドを学習したAIが、24時間365日、クライアントに寄り添います。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#contact"
                className="inline-flex items-center gap-2 rounded-full bg-[#c9a84c] px-7 py-3 text-sm font-bold text-[#0d0d14] shadow-lg shadow-[#c9a84c]/20 transition hover:-translate-y-0.5 hover:bg-[#e8d08a]"
              >
                導入を相談する
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#solution"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-7 py-3 text-sm font-medium text-white transition hover:border-[#c9a84c]/50 hover:text-[#e8d08a]"
              >
                システムを見る
              </a>
            </div>
          </div>

          {/* Right column: Dashboard mockup */}
          <div className="rounded-3xl bg-white/95 shadow-[0_12px_48px_rgba(13,13,20,0.15)]">
            <div className="flex items-center gap-2 rounded-t-3xl bg-[#1a1a2e] px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              <span className="ml-3 text-xs text-white/50">AIカウンセリング管理画面</span>
            </div>
            <div className="grid grid-cols-3 gap-3 border-b border-[#f0e4d8] p-4">
              {[
                { label: "会員数", value: "247" },
                { label: "AI対話/月", value: "1.2k" },
                { label: "継続率", value: "94%" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-[#f8f7f4] p-3 text-center">
                  <p className={cn("text-xl text-[#51433c]", TITLE_FONT)}>{stat.value}</p>
                  <p className="text-[10px] text-[#8b7a71]">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-b border-[#f0e4d8] p-4">
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-[#fff5ea] px-3 py-2">
                <p className="text-xs text-[#51433c]">最近また不安が強くて…</p>
              </div>
              <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-[#d59da9] px-3 py-2">
                <p className="text-xs text-white">前回のセッションで出てきたテーマですね。もう少し聞かせてください。</p>
              </div>
            </div>
            <div className="space-y-2 p-4">
              {[
                { name: "田中 あい", status: "セッション中", color: "bg-[#2a7a7a]" },
                { name: "鈴木 まりこ", status: "新規登録", color: "bg-[#c9a84c]" },
                { name: "佐藤 けいこ", status: "継続中", color: "bg-[#2a7a7a]" },
              ].map((user) => (
                <div key={user.name} className="flex items-center justify-between rounded-xl bg-[#f8f7f4] px-3 py-2">
                  <span className="text-xs font-medium text-[#51433c]">{user.name}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium text-white", user.color)}>
                    {user.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Pain Points (Dark) ===== */}
      <section ref={addRevealRef} className="bg-[#0d0d14] px-4 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs italic tracking-[0.2em] text-[#c9a84c]/60" style={{ fontFamily: "serif" }}>
            The Problem
          </p>
          <h2 className={cn("mt-3 text-3xl text-white md:text-4xl", TITLE_FONT)}>
            人を支える仕事の、3つの限界
          </h2>
          <div className="mt-2 h-0.5 w-10 bg-[#c9a84c]" />

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PAIN_POINTS.map((p) => (
              <div
                key={p.num}
                className="relative rounded-3xl border border-white/5 bg-white/[0.03] p-6 transition hover:bg-[#2a7a7a]/10"
              >
                <span className="absolute right-4 top-4 text-4xl font-bold text-white/[0.06]" style={{ fontFamily: "serif" }}>
                  {p.num}
                </span>
                <p.icon className="h-8 w-8 text-[#c9a84c]" />
                <h3 className="mt-4 text-base font-bold text-white">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Solution (Light) ===== */}
      <section ref={addRevealRef} id="solution" className="px-4 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <SectionLabel>The Solution</SectionLabel>
          <h2 className={cn("mt-3 text-2xl text-[#51433c] md:text-3xl", TITLE_FONT)}>
            あなたのメソッドを学習した
            <br className="hidden md:block" />
            専用AIシステムを構築します
          </h2>
          <div className="mt-2 h-0.5 w-10 bg-[#d59da9]" />

          <div className="mt-12 grid gap-10 md:grid-cols-2">
            {/* System diagram */}
            <div className="rounded-3xl bg-[#1a1a2e] p-6 md:p-8">
              <div
                className="absolute inset-0 rounded-3xl opacity-[0.03]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(201,168,76,1) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,1) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                  position: "absolute",
                }}
              />
              <div className="relative space-y-4">
                {[
                  { icon: "📚", label: "あなたのメソッド・知識" },
                  { icon: "🤖", label: "専用AIカウンセラー" },
                  { icon: "📓", label: "感情日記・履歴管理" },
                  { icon: "💳", label: "決済・会員管理" },
                ].map((node, i) => (
                  <div key={node.label}>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-[#c9a84c]/40">
                      <span className="text-xl">{node.icon}</span>
                      <span className="text-sm font-medium text-white">{node.label}</span>
                    </div>
                    {i < 3 && (
                      <div className="flex justify-center py-1">
                        <span className="text-lg text-[#c9a84c]/40">↓</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Feature list */}
            <div className="space-y-0 divide-y divide-[#f0e4d8]">
              {SOLUTION_ITEMS.map((item) => (
                <div key={item.num} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-4">
                    <span className={cn("text-xl text-[#d59da9]", TITLE_FONT)} style={{ fontFamily: "serif" }}>
                      {item.num}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-[#51433c]">{item.title}</h4>
                      <p className="mt-1 text-sm leading-relaxed text-[#8b7a71]">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Package (Light alt) ===== */}
      <section ref={addRevealRef} id="package" className="border-y border-[#f0e4d8] bg-[#f8f7f4] px-4 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <SectionLabel>Delivery Package</SectionLabel>
          <h2 className={cn("mt-3 text-2xl text-[#51433c] md:text-3xl", TITLE_FONT)}>
            納品パッケージに含まれるもの
          </h2>
          <div className="mt-2 h-0.5 w-10 bg-[#d59da9]" />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PACKAGES.map((pkg) => (
              <div
                key={pkg.title}
                className={cn(
                  "rounded-3xl p-5 transition hover:shadow-[0_18px_38px_rgba(81,67,60,0.07)]",
                  pkg.highlight
                    ? "bg-[#1a1a2e] text-white"
                    : "border border-[#f0e4d8] bg-white/90"
                )}
              >
                <span className="text-2xl">{pkg.icon}</span>
                <h4 className={cn(
                  "mt-3 text-sm font-bold",
                  pkg.highlight ? "text-white" : "text-[#51433c]"
                )}>
                  {pkg.title}
                </h4>
                <ul className="mt-3 space-y-2">
                  {pkg.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs">
                      <span className={pkg.highlight ? "text-[#2a7a7a]" : "text-[#d59da9]"}>→</span>
                      <span className={pkg.highlight ? "text-white/70" : "text-[#8b7a71]"}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Flow (Light) ===== */}
      <section ref={addRevealRef} id="flow" className="px-4 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <SectionLabel className="justify-center">Process</SectionLabel>
            <h2 className={cn("mt-3 text-2xl text-[#51433c] md:text-3xl", TITLE_FONT)}>
              導入の流れ
            </h2>
            <div className="mx-auto mt-2 h-0.5 w-10 bg-[#d59da9]" />
          </div>

          <div className="relative mt-14">
            {/* Connecting line (PC only) */}
            <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-[#d59da9] via-[#c9a84c] to-[#2a7a7a] md:block" />

            <div className="grid gap-8 md:grid-cols-5">
              {FLOW_STEPS.map((step) => (
                <div key={step.num} className="relative text-center">
                  <div className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#f0e4d8] bg-white text-2xl shadow-[0_4px_16px_rgba(81,67,60,0.08)] transition hover:border-[#d59da9] hover:shadow-[0_0_20px_rgba(213,157,169,0.18)]">
                    {step.icon}
                  </div>
                  <p className={cn("mt-3 text-xs text-[#d59da9]", TITLE_FONT)} style={{ fontFamily: "serif" }}>
                    STEP {step.num}
                  </p>
                  <h4 className="mt-1 text-sm font-bold text-[#51433c]">{step.title}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-[#8b7a71]">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Who (Dark) ===== */}
      <section ref={addRevealRef} id="who" className="bg-[#1a1a2e] px-4 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs italic tracking-[0.2em] text-[#c9a84c]/60" style={{ fontFamily: "serif" }}>
            For Whom
          </p>
          <h2 className={cn("mt-3 text-2xl text-white md:text-3xl", TITLE_FONT)}>
            こんな方に向いています
          </h2>
          <div className="mt-2 h-0.5 w-10 bg-[#c9a84c]" />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {WHO_CARDS.map((card) => (
              <div
                key={card.title}
                className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-5 transition hover:-translate-y-1 hover:bg-[#2a7a7a]/10"
              >
                <span className="text-2xl">{card.icon}</span>
                <h4 className="mt-3 text-sm font-bold text-white">{card.title}</h4>
                <p className="mt-2 text-xs leading-relaxed text-white/45">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA (Darkest) ===== */}
      <section ref={addRevealRef} id="contact" className="relative bg-[#0d0d14] px-4 py-20 md:py-28">
        <div className="absolute bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#2a7a7a]/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <p className="text-xs italic tracking-[0.2em] text-[#c9a84c]" style={{ fontFamily: "serif" }}>
            Get Started
          </p>
          <h2 className={cn("mt-4 text-3xl text-white md:text-4xl", TITLE_FONT)}>
            まずは、お気軽にご相談ください。
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/50">
            どんな規模・ジャンルでも対応可能です。あなたのサービスに最適なAIシステムをご提案します。
          </p>

          <form
            className="mt-10 flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const email = (form.elements.namedItem("email") as HTMLInputElement)?.value;
              if (email) {
                window.location.href = `mailto:contact@namisapo.app?subject=AIシステム導入相談&body=メールアドレス: ${email}`;
              }
            }}
          >
            <input
              name="email"
              type="email"
              required
              placeholder="メールアドレスを入力"
              className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/30"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#c9a84c] px-7 py-3 text-sm font-bold text-[#0d0d14] shadow-lg shadow-[#c9a84c]/20 transition hover:-translate-y-0.5 hover:bg-[#e8d08a]"
            >
              相談する
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="mt-4 text-[11px] text-white/30">
            ※ 返信は通常2営業日以内。費用・条件は相談の上で決定します。
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#2a7a7a]", className)}>
      <span className="inline-block h-px w-7 bg-[#2a7a7a]" />
      {children}
    </p>
  );
}
