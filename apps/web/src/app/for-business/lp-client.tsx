"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Clock, TrendingDown, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const HEADING = "font-heading";
const BODY = "font-body";

const TAGS = ["占い師", "心理カウンセラー", "コーチング", "スピリチュアル", "オンラインサロン"];

const PAIN_POINTS = [
  { num: "01", icon: Clock, title: "セッション外はサポートできない", desc: "クライアントが最も辛いのは深夜や週末。しかしあなたは24時間対応できません。" },
  { num: "02", icon: TrendingDown, title: "継続率が上がらない", desc: "セッションとセッションの間に何もないと、クライアントは離脱しやすくなります。" },
  { num: "03", icon: Zap, title: "スケールに限界がある", desc: "1人でできる人数に上限があります。AIが補助すれば、より多くの人を支えられます。" },
];

const SOLUTION_ITEMS = [
  { num: "01", title: "あなたの哲学・メソッドを学習", desc: "講義動画・テキスト・資料をもとにRAGナレッジベースを構築。AIがあなたの言葉・考え方で応答します。" },
  { num: "02", title: "あなたのブランドで展開", desc: "AIキャラクター名・デザイン・トーンはすべてカスタマイズ可能。あなたのサービスの一部として自然に溶け込みます。" },
  { num: "03", title: "決済からサポートまで一元管理", desc: "サブスクリプション課金・会員管理・AIサポートをひとつのプラットフォームで完結。運営の手間を最小化します。" },
];

const DELIVERY_PACKAGES = [
  { icon: "🧠", title: "RAGナレッジベース構築", highlight: true, items: ["資料・動画トランスクリプト整理", "カテゴリ別ナレッジ分類", "Supabase ベクトルDB構築", "応答品質テスト・チューニング"] },
  { icon: "💬", title: "AIカウンセリングチャット", items: ["AIキャラクター設定", "チャットUI実装", "履歴・分析ダッシュボード"] },
  { icon: "👥", title: "会員・クライアント管理", items: ["会員登録・認証機能", "クライアント一覧・詳細", "管理者ダッシュボード"] },
  { icon: "💳", title: "決済・サブスク機能", items: ["Stripe 決済連携", "プラン設定・変更", "請求・領収書自動発行", "解約・停止管理"] },
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
  { icon: "🧠", title: "心理カウンセラー", desc: "セッション外の感情サポートでクライアントの変化を継続的に追えます。" },
  { icon: "🎯", title: "コーチング・メンター", desc: "課題・目標の振り返りをAIがサポート。コーチングの効果を最大化します。" },
  { icon: "🌐", title: "オンラインサロン運営者", desc: "会員一人ひとりへのパーソナルサポートをスケーラブルに実現します。" },
  { icon: "✨", title: "スピリチュアル・ヒーリング系", desc: "あなたのエネルギーワーク・思想をAIに宿らせ、クライアントを24時間サポート。" },
];

const PRICE_PLANS = [
  {
    name: "ライトパッケージ",
    price: "10万円",
    tax: "税抜き",
    desc: "御社専用のAIエージェント構築（LINE版も可）",
    example: "例）ミシェルAI 1体",
    delivery: "納期 1週間〜10日間",
  },
  {
    name: "標準パッケージ",
    price: "20万円",
    tax: "税抜き",
    featured: true,
    desc: "御社専用のHPとAIエージェント（LINE版も可）",
    example: "例）ミシェルAI 1体 + HP",
    delivery: "",
  },
  {
    name: "専門パッケージ",
    price: "40万円",
    tax: "税抜き",
    desc: "御社専用のAIエージェント及びプラットフォーム（ご要望をお伺いいたします）",
    example: "",
    delivery: "",
  },
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
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;500;600;700&family=Noto+Sans+JP:wght@300;400;500;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');

        .btob-page {
          --ink: #0d0d14;
          --ink-soft: #1a1a2e;
          --surface: #f8f7f4;
          --surface-2: #f0ede8;
          --gold: #c9a84c;
          --gold-light: #e8d08a;
          --gold-pale: #f5edd8;
          --teal: #2a7a7a;
          --teal-light: #3d9e9e;
          --teal-pale: #e8f4f4;
          --text: #1a1a2e;
          --text-muted: #6b6880;
          font-family: 'Noto Sans JP', 'Hiragino Sans', sans-serif;
          color: var(--text);
          background: var(--surface);
        }

        .btob-page .font-heading {
          font-family: 'Shippori Mincho', serif;
          font-weight: 600;
        }

        .btob-page .font-body {
          font-family: 'Noto Sans JP', sans-serif;
        }

        .btob-page .font-accent {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
        }

        .btob-gold-bar {
          width: 40px;
          height: 2px;
          background: var(--gold);
          margin-top: 16px;
          margin-bottom: 40px;
        }

        .btob-slabel {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 0.85rem;
          letter-spacing: 0.2em;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .btob-slabel::before {
          content: '';
          width: 28px;
          height: 1px;
        }
      `}</style>

      <div className="btob-page">
        {/* ── NAV ── */}
        <nav
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            background: "rgba(248,247,244,0.92)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(26,26,46,0.1)",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
          }}
        >
          <span className="font-heading" style={{ fontSize: "1rem", color: "var(--text)" }}>
            AI Counseling <span style={{ color: "var(--teal)" }}>Platform</span>
          </span>
          <div className="hidden items-center gap-6 md:flex">
            {[
              { label: "システム", href: "#solution" },
              { label: "パッケージ", href: "#package" },
              { label: "導入フロー", href: "#flow" },
              { label: "対象", href: "#who" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                style={{ fontSize: "0.8rem", color: "var(--text-muted)", textDecoration: "none" }}
              >
                {link.label}
              </a>
            ))}
          </div>
          <a
            href="https://lin.ee/ykOLfBH"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "8px 20px",
              background: "var(--ink)",
              color: "white",
              fontSize: "0.8rem",
              fontWeight: 500,
              textDecoration: "none",
              borderRadius: 4,
              transition: "background 0.2s",
            }}
          >
            まずは相談する
          </a>
        </nav>

        {/* ── Hero (Dark) ── */}
        <section
          style={{
            background: "var(--ink-soft)",
            position: "relative",
            overflow: "hidden",
            paddingTop: 64,
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(201,168,76,1) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full" style={{ background: "rgba(42,122,122,0.08)", filter: "blur(80px)" }} />

          <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-2 md:items-center md:py-28">
            <div>
              <div className="flex flex-wrap gap-2">
                {TAGS.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      background: "rgba(201,168,76,0.12)",
                      border: "1px solid rgba(201,168,76,0.25)",
                      color: "var(--gold-light)",
                      fontSize: "0.7rem",
                      padding: "4px 12px",
                      borderRadius: 20,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <p className="font-accent" style={{ marginTop: 24, fontSize: "0.8rem", letterSpacing: "0.2em", color: "var(--gold)" }}>
                AI Counseling System for Professionals
              </p>

              <h1 className="font-heading" style={{ marginTop: 16, fontSize: "clamp(1.8rem, 4vw, 2.8rem)", lineHeight: 1.35, color: "white" }}>
                あなたのサービスに、
                <br />
                <span style={{ color: "var(--gold-light)" }}>24時間対応のAIを。</span>
              </h1>

              <p style={{ marginTop: 20, maxWidth: 480, fontSize: "0.9rem", lineHeight: 1.8, color: "rgba(255,255,255,0.55)" }}>
                クライアントはセッションの外でも悩んでいます。あなたの知識・哲学・メソッドを学習したAIが、24時間365日、クライアントに寄り添います。
              </p>

              <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", gap: 12 }}>
                <a
                  href="#contact"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 28px",
                    background: "var(--gold)",
                    color: "var(--ink)",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    textDecoration: "none",
                    borderRadius: 4,
                    transition: "background 0.2s",
                  }}
                >
                  導入を相談する <ArrowRight style={{ width: 16, height: 16 }} />
                </a>
                <a
                  href="#solution"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 28px",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "white",
                    fontSize: "0.85rem",
                    textDecoration: "none",
                    borderRadius: 4,
                    transition: "all 0.2s",
                  }}
                >
                  システムを見る
                </a>
              </div>
            </div>

            {/* Dashboard mockup */}
            <div style={{ background: "white", borderRadius: 12, boxShadow: "0 12px 48px rgba(13,13,20,0.12)", overflow: "hidden" }}>
              <div style={{ background: "var(--ink-soft)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
                <span style={{ marginLeft: 12, fontSize: "0.7rem", color: "rgba(255,255,255,0.5)" }}>AIカウンセリング管理画面</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: 16, borderBottom: "1px solid var(--surface-2)" }}>
                {[{ l: "会員数", v: "247" }, { l: "AI対話/月", v: "1.2k" }, { l: "継続率", v: "94%" }].map((s) => (
                  <div key={s.l} style={{ background: "var(--surface-2)", borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                    <p className="font-heading" style={{ fontSize: "1.2rem", color: "var(--text)" }}>{s.v}</p>
                    <p style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{s.l}</p>
                  </div>
                ))}
              </div>
              <div style={{ padding: 16, borderBottom: "1px solid var(--surface-2)" }}>
                <div style={{ background: "var(--surface)", borderRadius: "12px 12px 12px 2px", padding: "8px 12px", fontSize: "0.75rem", color: "var(--text)", maxWidth: "80%", marginBottom: 8 }}>
                  最近また不安が強くて…
                </div>
                <div style={{ background: "var(--teal)", borderRadius: "12px 12px 2px 12px", padding: "8px 12px", fontSize: "0.75rem", color: "white", maxWidth: "80%", marginLeft: "auto" }}>
                  前回のセッションで出てきたテーマですね。もう少し聞かせてください。
                </div>
              </div>
              <div style={{ padding: 16 }}>
                {[{ n: "田中 あい", s: "セッション中", c: "var(--teal)" }, { n: "鈴木 まりこ", s: "新規登録", c: "var(--gold)" }, { n: "佐藤 けいこ", s: "継続中", c: "var(--teal)" }].map((u) => (
                  <div key={u.n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface)", borderRadius: 8, padding: "8px 12px", marginBottom: 6 }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 500 }}>{u.n}</span>
                    <span style={{ fontSize: "0.65rem", background: u.c, color: "white", padding: "2px 10px", borderRadius: 12 }}>{u.s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Pain Points (Darkest) ── */}
        <section ref={addRevealRef} style={{ background: "var(--ink)", padding: "80px 20px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <p className="btob-slabel" style={{ color: "rgba(201,168,76,0.6)" }}>The Problem</p>
            <h2 className="font-heading" style={{ marginTop: 12, fontSize: "clamp(1.5rem, 3vw, 2rem)", color: "white" }}>
              人を支える仕事の、3つの限界
            </h2>
            <div className="btob-gold-bar" />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
              {PAIN_POINTS.map((p) => (
                <div
                  key={p.num}
                  style={{
                    position: "relative",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 12,
                    padding: "28px 24px",
                    transition: "background 0.3s",
                  }}
                >
                  <span style={{ position: "absolute", right: 16, top: 12, fontSize: "2.5rem", fontWeight: 700, opacity: 0.06, color: "white", fontFamily: "serif" }}>
                    {p.num}
                  </span>
                  <p.icon style={{ width: 28, height: 28, color: "var(--gold)" }} />
                  <h3 style={{ marginTop: 16, fontSize: "0.95rem", fontWeight: 700, color: "white" }}>{p.title}</h3>
                  <p style={{ marginTop: 8, fontSize: "0.85rem", lineHeight: 1.7, color: "rgba(255,255,255,0.5)" }}>{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Solution (Light) ── */}
        <section ref={addRevealRef} id="solution" style={{ background: "var(--surface)", padding: "80px 20px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <p className="btob-slabel" style={{ color: "var(--teal)" }}>The Solution</p>
            <h2 className="font-heading" style={{ marginTop: 12, fontSize: "clamp(1.3rem, 2.5vw, 1.7rem)", color: "var(--text)" }}>
              あなたのメソッドを学習した専用AIシステムを構築します
            </h2>
            <div className="btob-gold-bar" style={{ background: "var(--teal)" }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }} className="btob-sp-stack">
              {/* System diagram */}
              <div style={{ background: "var(--ink-soft)", borderRadius: 12, padding: "28px 24px", position: "relative", overflow: "hidden" }}>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.03,
                    backgroundImage: "linear-gradient(rgba(201,168,76,1) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,1) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                  }}
                />
                <div style={{ position: "relative" }}>
                  {[
                    { icon: "📚", label: "あなたのメソッド・知識" },
                    { icon: "🤖", label: "専用AIカウンセラー" },
                    { icon: "💳", label: "決済・会員管理" },
                  ].map((node, i, arr) => (
                    <div key={node.label}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "14px 16px", transition: "border-color 0.3s" }}>
                        <span style={{ fontSize: "1.2rem" }}>{node.icon}</span>
                        <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "white" }}>{node.label}</span>
                      </div>
                      {i < arr.length - 1 && (
                        <div style={{ textAlign: "center", padding: "4px 0" }}>
                          <span style={{ color: "rgba(201,168,76,0.4)", fontSize: "1rem" }}>↓</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature list */}
              <div>
                {SOLUTION_ITEMS.map((item, i) => (
                  <div key={item.num} style={{ padding: "20px 0", borderBottom: i < SOLUTION_ITEMS.length - 1 ? "1px solid var(--surface-2)" : "none" }}>
                    <div style={{ display: "flex", gap: 16 }}>
                      <span className="font-accent" style={{ fontSize: "1.6rem", color: "var(--gold)", fontStyle: "normal" }}>
                        {item.num}
                      </span>
                      <div>
                        <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>{item.title}</h4>
                        <p style={{ marginTop: 4, fontSize: "0.82rem", lineHeight: 1.7, color: "var(--text-muted)" }}>{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Delivery Package (Light alt) ── */}
        <section ref={addRevealRef} id="package" style={{ background: "var(--surface-2)", padding: "80px 20px", borderTop: "1px solid rgba(26,26,46,0.06)", borderBottom: "1px solid rgba(26,26,46,0.06)" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <p className="btob-slabel" style={{ color: "var(--teal)" }}>Delivery Package</p>
            <h2 className="font-heading" style={{ marginTop: 12, fontSize: "clamp(1.3rem, 2.5vw, 1.7rem)", color: "var(--text)" }}>
              納品パッケージに含まれるもの
            </h2>
            <div className="btob-gold-bar" style={{ background: "var(--teal)" }} />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              {DELIVERY_PACKAGES.map((pkg) => (
                <div
                  key={pkg.title}
                  style={{
                    background: pkg.highlight ? "var(--ink-soft)" : "white",
                    border: pkg.highlight ? "none" : "1px solid var(--surface-2)",
                    borderRadius: 12,
                    padding: "24px 20px",
                    transition: "box-shadow 0.3s, background 0.3s",
                  }}
                >
                  <span style={{ fontSize: "1.5rem" }}>{pkg.icon}</span>
                  <h4 style={{ marginTop: 12, fontSize: "0.85rem", fontWeight: 700, color: pkg.highlight ? "white" : "var(--text)" }}>
                    {pkg.title}
                  </h4>
                  <ul style={{ marginTop: 12, listStyle: "none", padding: 0 }}>
                    {pkg.items.map((item) => (
                      <li key={item} style={{ display: "flex", gap: 6, alignItems: "flex-start", fontSize: "0.75rem", padding: "3px 0", color: pkg.highlight ? "rgba(255,255,255,0.65)" : "var(--text-muted)" }}>
                        <span style={{ color: pkg.highlight ? "var(--teal)" : "var(--teal)", flexShrink: 0 }}>→</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Flow (Light) ── */}
        <section ref={addRevealRef} id="flow" style={{ background: "var(--surface)", padding: "80px 20px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
            <p className="btob-slabel" style={{ color: "var(--teal)", justifyContent: "center" }}>Process</p>
            <h2 className="font-heading" style={{ marginTop: 12, fontSize: "clamp(1.3rem, 2.5vw, 1.7rem)", color: "var(--text)" }}>
              導入の流れ
            </h2>
            <div className="btob-gold-bar" style={{ background: "var(--teal)", margin: "16px auto 40px" }} />

            <div style={{ position: "relative" }}>
              <div className="btob-flow-line" style={{ position: "absolute", left: 0, right: 0, top: 32, height: 1, background: "linear-gradient(to right, var(--gold), var(--teal))" }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, position: "relative" }} className="btob-sp-stack-flow">
                {FLOW_STEPS.map((step) => (
                  <div key={step.num} style={{ textAlign: "center" }}>
                    <div style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: "white",
                      border: "1px solid var(--surface-2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.5rem",
                      margin: "0 auto",
                      position: "relative",
                      zIndex: 1,
                      boxShadow: "0 4px 16px rgba(13,13,20,0.06)",
                      transition: "border-color 0.3s, box-shadow 0.3s",
                    }}>
                      {step.icon}
                    </div>
                    <p className="font-accent" style={{ marginTop: 10, fontSize: "0.75rem", color: "var(--gold)", fontStyle: "normal", letterSpacing: "0.1em" }}>
                      STEP {step.num}
                    </p>
                    <h4 style={{ marginTop: 4, fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>{step.title}</h4>
                    <p style={{ marginTop: 4, fontSize: "0.72rem", lineHeight: 1.6, color: "var(--text-muted)" }}>{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Who (Dark) ── */}
        <section ref={addRevealRef} id="who" style={{ background: "var(--ink-soft)", padding: "80px 20px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <p className="btob-slabel" style={{ color: "rgba(201,168,76,0.6)" }}>For Whom</p>
            <h2 className="font-heading" style={{ marginTop: 12, fontSize: "clamp(1.3rem, 2.5vw, 1.7rem)", color: "white" }}>
              こんな方に向いています
            </h2>
            <div className="btob-gold-bar" />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
              {WHO_CARDS.map((card) => (
                <div
                  key={card.title}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 12,
                    padding: "20px 16px",
                    transition: "transform 0.3s, background 0.3s",
                  }}
                >
                  <span style={{ fontSize: "1.5rem" }}>{card.icon}</span>
                  <h4 style={{ marginTop: 10, fontSize: "0.82rem", fontWeight: 700, color: "white" }}>{card.title}</h4>
                  <p style={{ marginTop: 6, fontSize: "0.72rem", lineHeight: 1.7, color: "rgba(255,255,255,0.45)" }}>{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section ref={addRevealRef} style={{ background: "var(--surface)", padding: "80px 20px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
            <p className="btob-slabel" style={{ color: "var(--teal)", justifyContent: "center" }}>Pricing</p>
            <h2 className="font-heading" style={{ marginTop: 12, fontSize: "clamp(1.3rem, 2.5vw, 1.7rem)", color: "var(--text)" }}>
              料金プラン
            </h2>
            <div className="btob-gold-bar" style={{ background: "var(--teal)", margin: "16px auto 40px" }} />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, textAlign: "left" }}>
              {PRICE_PLANS.map((plan) => (
                <div
                  key={plan.name}
                  style={{
                    background: plan.featured ? "var(--ink-soft)" : "white",
                    border: plan.featured ? "2px solid var(--gold)" : "1px solid var(--surface-2)",
                    borderRadius: 12,
                    padding: "32px 24px",
                    position: "relative",
                    boxShadow: plan.featured ? "0 8px 32px rgba(201,168,76,0.12)" : "0 4px 16px rgba(13,13,20,0.04)",
                    transition: "transform 0.3s, box-shadow 0.3s",
                  }}
                >
                  {plan.featured && (
                    <span style={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "var(--gold)",
                      color: "var(--ink)",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      padding: "4px 16px",
                      borderRadius: 12,
                      whiteSpace: "nowrap",
                    }}>
                      おすすめ
                    </span>
                  )}
                  <h4 className="font-heading" style={{ fontSize: "1.1rem", color: plan.featured ? "white" : "var(--text)" }}>
                    {plan.name}
                  </h4>
                  <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span className="font-heading" style={{ fontSize: "2rem", color: plan.featured ? "var(--gold)" : "var(--text)" }}>
                      {plan.price}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: plan.featured ? "rgba(255,255,255,0.5)" : "var(--text-muted)" }}>
                      （{plan.tax}）
                    </span>
                  </div>
                  <p style={{ marginTop: 12, fontSize: "0.85rem", lineHeight: 1.7, color: plan.featured ? "rgba(255,255,255,0.7)" : "var(--text-muted)" }}>
                    {plan.desc}
                  </p>
                  {plan.example && (
                    <p style={{ marginTop: 8, fontSize: "0.78rem", color: plan.featured ? "var(--gold-light)" : "var(--teal)", fontWeight: 500 }}>
                      {plan.example}
                    </p>
                  )}
                  {plan.delivery && (
                    <p style={{ marginTop: 4, fontSize: "0.72rem", color: plan.featured ? "rgba(255,255,255,0.4)" : "var(--text-muted)" }}>
                      {plan.delivery}
                    </p>
                  )}
                  <a
                    href="#contact"
                    style={{
                      display: "block",
                      marginTop: 20,
                      padding: "12px",
                      background: plan.featured ? "var(--gold)" : "var(--ink)",
                      color: plan.featured ? "var(--ink)" : "var(--gold)",
                      textAlign: "center",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      textDecoration: "none",
                      borderRadius: 6,
                      transition: "opacity 0.2s",
                    }}
                  >
                    相談する →
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA (Darkest) ── */}
        <section ref={addRevealRef} id="contact" style={{ background: "var(--ink)", padding: "80px 20px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 400, height: 400, borderRadius: "50%", background: "rgba(42,122,122,0.14)", filter: "blur(100px)" }} />

          <div style={{ position: "relative", zIndex: 1, maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
            <p className="font-accent" style={{ fontSize: "0.85rem", letterSpacing: "0.2em", color: "var(--gold)" }}>
              Get Started
            </p>
            <h2 className="font-heading" style={{ marginTop: 16, fontSize: "clamp(1.5rem, 3vw, 2rem)", color: "white" }}>
              まずは、お気軽にご相談ください。
            </h2>
            <p style={{ marginTop: 16, fontSize: "0.85rem", lineHeight: 1.8, color: "rgba(255,255,255,0.5)" }}>
              どんな規模・ジャンルでも対応可能です。あなたのサービスに最適なAIシステムをご提案します。
            </p>

            <div style={{ marginTop: 36 }}>
              <a
                href="https://lin.ee/ykOLfBH"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 32px",
                  background: "#06C755",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  textDecoration: "none",
                  borderRadius: 6,
                  transition: "opacity 0.2s",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                LINEで相談する
              </a>
            </div>

            <p style={{ marginTop: 16, fontSize: "0.7rem", color: "rgba(255,255,255,0.3)" }}>
              ※ LINEで友だち追加後、お気軽にメッセージをお送りください。
            </p>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer style={{ background: "var(--ink)", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "28px 20px", textAlign: "center" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>
            <span>AI Counseling Platform</span>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <Link href="/terms" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>利用規約</Link>
              <Link href="/privacy" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>プライバシーポリシー</Link>
            </div>
            <span>© 2025 namisapo.app All rights reserved.</span>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        @media (max-width: 900px) {
          .btob-sp-stack {
            grid-template-columns: 1fr !important;
          }
          .btob-sp-stack-flow {
            grid-template-columns: 1fr !important;
          }
          .btob-flow-line {
            display: none !important;
          }
          .btob-cta-row {
            flex-direction: column !important;
          }
        }
      `}</style>
    </>
  );
}
