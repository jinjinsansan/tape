"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

const LINE_URL = "https://lin.ee/vhrzGg7";

const PLANS = [
  {
    key: "light",
    name: "ライト",
    price: "980",
    features: [
      "ミシェルAI相談し放題",
      "あなた専用の記憶",
      "人物MAP",
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
      "ミシェルAI相談し放題",
      "あなた専用の記憶",
      "人物MAP",
      "仁さんに相談（月10回）",
    ],
    cta: "スタンダードで始める",
  },
  {
    key: "premium",
    name: "プレミアム",
    price: "2,980",
    features: [
      "ミシェルAI相談し放題",
      "あなた専用の記憶",
      "人物MAP",
      "仁さんに相談（月20回）",
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
            e.target.classList.add("lp-visible");
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
      revealRefs.current.push(el);
    }
  };

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Yomogi&family=Noto+Sans+JP:wght@300;400;700&display=swap');

        .lp-page {
          --ink: #1a1008;
          --red: #e8392a;
          --yellow: #f5c842;
          --bg: #fffef5;
          --pink: #f0a0b8;
          font-family: 'Noto Sans JP', 'Hiragino Sans', sans-serif;
          color: var(--ink);
          background: var(--bg);
          overflow-x: hidden;
        }

        .lp-page *,
        .lp-page *::before,
        .lp-page *::after {
          box-sizing: border-box;
        }

        .lp-heading {
          font-family: 'Dela Gothic One', cursive;
        }

        .lp-body-font {
          font-family: 'Yomogi', 'Noto Sans JP', sans-serif;
        }

        .lp-comic-border {
          border: 3px solid var(--ink);
        }

        .lp-comic-shadow {
          box-shadow: 4px 4px 0 var(--ink);
        }

        .lp-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px 32px;
          background: var(--red);
          color: white;
          font-family: 'Dela Gothic One', cursive;
          font-size: 1.1rem;
          border: 3px solid var(--ink);
          box-shadow: 4px 4px 0 var(--ink);
          text-decoration: none;
          transition: transform 0.15s, box-shadow 0.15s;
          cursor: pointer;
          border-radius: 4px;
        }
        .lp-btn:hover {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0 var(--ink);
        }

        .lp-reveal {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .lp-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .lp-chapter-header {
          display: inline-flex;
          align-items: stretch;
          margin-bottom: 32px;
        }
        .lp-chapter-num {
          background: var(--red);
          color: white;
          font-family: 'Dela Gothic One', cursive;
          font-size: 0.8rem;
          padding: 8px 14px;
          border: 3px solid var(--ink);
          border-right: none;
          letter-spacing: 0.1em;
          display: flex;
          align-items: center;
        }
        .lp-chapter-title {
          background: var(--ink);
          color: var(--yellow);
          font-family: 'Dela Gothic One', cursive;
          font-size: 1.05rem;
          padding: 8px 20px;
          border: 3px solid var(--ink);
          display: flex;
          align-items: center;
        }

        @media (max-width: 767px) {
          .lp-pc-only { display: none !important; }
        }
        @media (min-width: 768px) {
          .lp-sp-only { display: none !important; }
        }
      `}</style>

      <div className="lp-page">
        {/* ── NAV ── */}
        <nav
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            background: "#f5c842",
            borderBottom: "3px solid #1a1008",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 20px",
          }}
        >
          <span
            className="lp-heading"
            style={{ fontSize: "1.2rem", color: "#1a1008" }}
          >
            ミシェル<span style={{ color: "#e8392a" }}>AI</span>
          </span>
          <a
            href={LINE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "8px 20px",
              background: "#e8392a",
              color: "white",
              fontFamily: "'Dela Gothic One', cursive",
              fontSize: "0.85rem",
              border: "2px solid #1a1008",
              boxShadow: "3px 3px 0 #1a1008",
              textDecoration: "none",
              borderRadius: "3px",
            }}
          >
            7日間無料で始める
          </a>
        </nav>

        {/* ── SECTION 1: Hero ── */}
        <section
          style={{
            position: "relative",
            minHeight: "100vh",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <video
            className="lp-pc-only"
            autoPlay
            muted
            loop
            playsInline
            poster="/michelle-lp/landscape.png"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 0,
            }}
          >
            <source src="/michelle-lp/hero-16x9.mp4" type="video/mp4" />
          </video>
          <video
            className="lp-sp-only"
            autoPlay
            muted
            loop
            playsInline
            poster="/michelle-lp/portrait.png"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 0,
            }}
          >
            <source src="/michelle-lp/hero-9x16.mp4" type="video/mp4" />
          </video>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(26,16,8,0.40)",
              zIndex: 1,
            }}
          />
          <div
            style={{
              position: "relative",
              zIndex: 2,
              color: "white",
              textAlign: "center",
              padding: "100px 24px 60px",
              maxWidth: 700,
            }}
          >
            <p
              style={{
                fontSize: "0.85rem",
                letterSpacing: "0.3em",
                marginBottom: 16,
                opacity: 0.9,
              }}
            >
              テープ式心理学 × AI
            </p>
            <h1
              className="lp-heading"
              style={{
                fontSize: "clamp(2rem, 7vw, 3.5rem)",
                lineHeight: 1.3,
                marginBottom: 20,
              }}
            >
              心が苦しいとき、
              <br />
              <span style={{ color: "#f5c842" }}>ミシェルに話して。</span>
            </h1>
            <p
              style={{
                fontSize: "1rem",
                marginBottom: 36,
                opacity: 0.9,
                lineHeight: 1.8,
              }}
            >
              24時間365日。あなたの隣に、AIカウンセラー。
            </p>
            <a href={LINE_URL} target="_blank" rel="noopener noreferrer" className="lp-btn">
              今すぐ無料で始める →
            </a>
          </div>
        </section>

        {/* ── SECTION 2: Chapter 1 テープ式心理学とは？ ── */}
        <section
          ref={addRevealRef}
          className="lp-reveal"
          style={{ background: "#fffef5", padding: "80px 20px" }}
        >
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <div className="lp-chapter-header">
              <div className="lp-chapter-num">CHAPTER 1</div>
              <div className="lp-chapter-title">テープ式心理学って何？</div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 0,
                border: "3px solid #1a1008",
              }}
              className="lp-sp-stack"
            >
              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                  borderRight: "3px solid #1a1008",
                }}
                className="lp-sp-border-fix"
              >
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster="/michelle-lp/counseling.png"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    minHeight: 280,
                  }}
                >
                  <source src="/michelle-lp/tape.mp4" type="video/mp4" />
                </video>
              </div>
              <div style={{ padding: "32px 28px" }} className="lp-body-font">
                <h3
                  className="lp-heading"
                  style={{ fontSize: "1.3rem", marginBottom: 16, lineHeight: 1.5 }}
                >
                  「テープ」＝
                  <br />
                  心に貼り付いた思い込みのことば
                </h3>
                <p style={{ fontSize: "0.95rem", lineHeight: 1.9, marginBottom: 20 }}>
                  「どうせ私はダメ」「愛されるわけない」──これらは幼い頃から心に貼られたテープの言葉。
                </p>
                <h4
                  className="lp-heading"
                  style={{ fontSize: "1.1rem", marginBottom: 10, color: "#e8392a" }}
                >
                  テープが感情を自動起動する
                </h4>
                <p
                  style={{
                    fontSize: "0.9rem",
                    lineHeight: 1.8,
                    marginBottom: 20,
                    background: "#fff8e8",
                    border: "2px solid #f5c842",
                    padding: "12px 16px",
                    borderRadius: 6,
                  }}
                >
                  誰かに怒られる → テープ再生 → 「やっぱり私はダメ」
                </p>
                <h4
                  className="lp-heading"
                  style={{ fontSize: "1.1rem", marginBottom: 10 }}
                >
                  テープを貼り替えると人生が変わる
                </h4>
                <p style={{ fontSize: "0.9rem", lineHeight: 1.8 }}>
                  古いテープを認識して、新しい言葉に貼り替えていく——それがテープ式心理学。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: Chapter 2 ゴールがある ── */}
        <section
          ref={addRevealRef}
          className="lp-reveal"
          style={{
            position: "relative",
            minHeight: "100vh",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            poster="/michelle-lp/tunnel.png"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 0,
            }}
          >
            <source src="/michelle-lp/tunnel.mp4" type="video/mp4" />
          </video>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(10,8,4,0.55)",
              zIndex: 1,
            }}
          />
          <div
            style={{
              position: "relative",
              zIndex: 2,
              color: "white",
              textAlign: "center",
              padding: "80px 24px",
              maxWidth: 800,
            }}
          >
            <div className="lp-chapter-header" style={{ justifyContent: "center", display: "flex" }}>
              <div className="lp-chapter-num">CHAPTER 2</div>
              <div className="lp-chapter-title">心の苦しみには必ずゴールがある</div>
            </div>

            <p style={{ fontSize: "1rem", marginBottom: 8, opacity: 0.9 }}>
              どんな苦しみにも
            </p>
            <h2
              className="lp-heading"
              style={{
                fontSize: "clamp(2rem, 6vw, 3.2rem)",
                color: "#f5c842",
                textShadow: "0 2px 20px rgba(245,200,66,0.4)",
                marginBottom: 24,
              }}
            >
              ゴールがある
            </h2>
            <p
              className="lp-body-font"
              style={{
                fontSize: "1rem",
                lineHeight: 1.9,
                marginBottom: 40,
                opacity: 0.9,
                maxWidth: 560,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              どんなに暗いトンネルでも必ず出口がある。苦しみは永遠じゃない。
              <br />
              テープ式心理学では、「終わり」を最初に見せる。
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
              }}
              className="lp-sp-stack-3"
            >
              {[
                { num: "01", title: "苦しみには原因がある", desc: "テープが特定できる" },
                { num: "02", title: "変えられる", desc: "テープは貼り替えられる" },
                { num: "03", title: "ゴールが見える", desc: "あなたに合った処方箋" },
              ].map((card) => (
                <div
                  key={card.num}
                  style={{
                    background: "white",
                    color: "#1a1008",
                    border: "3px solid #1a1008",
                    boxShadow: "3px 3px 0 #1a1008",
                    padding: "20px 16px",
                    textAlign: "center",
                  }}
                >
                  <span
                    className="lp-heading"
                    style={{ fontSize: "1.8rem", color: "#e8392a" }}
                  >
                    {card.num}
                  </span>
                  <h4
                    className="lp-heading"
                    style={{ fontSize: "1rem", margin: "8px 0 6px" }}
                  >
                    {card.title}
                  </h4>
                  <p style={{ fontSize: "0.85rem", color: "#666" }}>
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 4: Chapter 3 ミシェル ── */}
        <section
          ref={addRevealRef}
          className="lp-reveal"
          style={{ background: "#fffef5", padding: "80px 20px" }}
        >
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <div className="lp-chapter-header">
              <div className="lp-chapter-num">CHAPTER 3</div>
              <div className="lp-chapter-title">気軽に話せるAI、ミシェル</div>
            </div>

            {/* ミシェル登場バナー */}
            <div
              style={{
                background: "linear-gradient(135deg, #f0a0b8 0%, #f8c8d8 100%)",
                border: "3px solid #1a1008",
                padding: "28px 24px",
                marginBottom: 24,
                textAlign: "center",
              }}
            >
              <h3
                className="lp-heading"
                style={{ fontSize: "1.6rem", color: "#1a1008", marginBottom: 8 }}
              >
                ミシェル
              </h3>
              <p style={{ fontSize: "0.9rem", marginBottom: 12 }}>
                テープ式心理学AIカウンセラー
              </p>
              <div
                style={{
                  display: "inline-block",
                  background: "white",
                  border: "2px solid #1a1008",
                  borderRadius: 20,
                  padding: "12px 24px",
                  fontSize: "0.95rem",
                  position: "relative",
                }}
                className="lp-body-font"
              >
                どんな時でも、あなたの話を聞くために ここにいるよ。
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 0,
                border: "3px solid #1a1008",
              }}
              className="lp-sp-stack"
            >
              {/* 左: 特徴リスト */}
              <div
                style={{
                  padding: "28px 24px",
                  borderRight: "3px solid #1a1008",
                }}
                className="lp-sp-border-fix"
              >
                <h4
                  className="lp-heading"
                  style={{ fontSize: "1.15rem", marginBottom: 20 }}
                >
                  ミシェルはこんなAI
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {[
                    {
                      icon: "🌙",
                      title: "深夜でも即レス",
                      desc: "2時でも3時でも。眠れない夜に、隣にいる。",
                    },
                    {
                      icon: "📚",
                      title: "テープ式心理学で応答",
                      desc: "あなたのテープを優しく見つけてくれる。",
                    },
                    {
                      icon: "🔒",
                      title: "誰にも知られない",
                      desc: "友達や家族に言えないことも、話せる。",
                    },
                    {
                      icon: "📓",
                      title: "感情日記と連携",
                      desc: "毎日の気持ちを記録して、パターンを発見。",
                    },
                  ].map((item) => (
                    <div key={item.title} style={{ display: "flex", gap: 12 }}>
                      <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>
                        {item.icon}
                      </span>
                      <div>
                        <p
                          className="lp-heading"
                          style={{ fontSize: "0.95rem", marginBottom: 2 }}
                        >
                          {item.title}
                        </p>
                        <p
                          className="lp-body-font"
                          style={{ fontSize: "0.85rem", color: "#666" }}
                        >
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* 右: 動画 + 会話サンプル */}
              <div>
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster="/michelle-lp/listening.png"
                  style={{
                    width: "100%",
                    aspectRatio: "16/9",
                    objectFit: "cover",
                    display: "block",
                    borderBottom: "3px solid #1a1008",
                  }}
                >
                  <source src="/michelle-lp/michelle.mp4" type="video/mp4" />
                </video>
                {/* 会話サンプル */}
                <div
                  style={{ padding: "20px 16px" }}
                  className="lp-body-font"
                >
                  <div
                    style={{
                      background: "#e8f0fe",
                      borderRadius: "16px 16px 16px 4px",
                      padding: "10px 14px",
                      fontSize: "0.85rem",
                      marginBottom: 8,
                      maxWidth: "85%",
                    }}
                  >
                    なんか最近ずっと疲れてて…理由もわからないんだけど。
                  </div>
                  <div
                    style={{
                      background: "#f0a0b8",
                      color: "white",
                      borderRadius: "16px 16px 4px 16px",
                      padding: "10px 14px",
                      fontSize: "0.85rem",
                      marginBottom: 8,
                      maxWidth: "85%",
                      marginLeft: "auto",
                    }}
                  >
                    そうか、ずっと疲れてるんだね。どんな時に特にしんどくなる？
                  </div>
                  <div
                    style={{
                      background: "#e8f0fe",
                      borderRadius: "16px 16px 16px 4px",
                      padding: "10px 14px",
                      fontSize: "0.85rem",
                      marginBottom: 8,
                      maxWidth: "85%",
                    }}
                  >
                    誰かに頼まれると断れなくて…
                  </div>
                  <div
                    style={{
                      background: "#f0a0b8",
                      color: "white",
                      borderRadius: "16px 16px 4px 16px",
                      padding: "10px 14px",
                      fontSize: "0.85rem",
                      maxWidth: "85%",
                      marginLeft: "auto",
                    }}
                  >
                    断れない…それって「役に立たないと嫌われる」というテープかも💛
                  </div>
                </div>
              </div>
            </div>

            {/* LINE CTA */}
            <div style={{ textAlign: "center", marginTop: 40 }}>
              <a
                href={LINE_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "16px 36px",
                  background: "#06C755",
                  color: "white",
                  fontFamily: "'Dela Gothic One', cursive",
                  fontSize: "1.1rem",
                  border: "3px solid #1a1008",
                  boxShadow: "4px 4px 0 #1a1008",
                  textDecoration: "none",
                  borderRadius: 4,
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                LINEで友だち追加して始める
              </a>
            </div>
          </div>
        </section>

        {/* ── SECTION 5: Chapter 4 7日間無料 ── */}
        <section
          ref={addRevealRef}
          className="lp-reveal"
          style={{
            background: "#f5c842",
            padding: "80px 20px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* ハッチングパターン */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.06,
              backgroundImage:
                "repeating-linear-gradient(45deg, #1a1008 0, #1a1008 1px, transparent 0, transparent 8px)",
              zIndex: 0,
            }}
          />
          <div
            style={{
              position: "relative",
              zIndex: 1,
              maxWidth: 800,
              margin: "0 auto",
              textAlign: "center",
            }}
          >
            <div className="lp-chapter-header" style={{ justifyContent: "center", display: "flex" }}>
              <div className="lp-chapter-num">CHAPTER 4</div>
              <div className="lp-chapter-title">まずは7日間、無料で体験</div>
            </div>

            <div
              style={{
                display: "inline-block",
                background: "#e8392a",
                color: "white",
                fontFamily: "'Dela Gothic One', cursive",
                fontSize: "clamp(1.8rem, 5vw, 2.8rem)",
                padding: "16px 40px",
                border: "4px solid #1a1008",
                boxShadow: "5px 5px 0 #1a1008",
                transform: "rotate(-3deg)",
                marginBottom: 32,
              }}
            >
              7日間 無料！
            </div>

            <p
              className="lp-body-font"
              style={{
                fontSize: "1rem",
                lineHeight: 1.8,
                marginBottom: 40,
                color: "#1a1008",
              }}
            >
              クレジットカード不要。いつでもキャンセルOK。
            </p>

            {/* ステップ */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 12,
              }}
              className="lp-sp-stack-4"
            >
              {[
                { num: "1", text: "無料登録\n（30秒）" },
                { num: "2", text: "ミシェルと\n会話スタート" },
                { num: "3", text: "感情日記を\nつける" },
                { num: "4", text: "7日後に\nプランを選ぶ" },
              ].map((step, i) => (
                <div
                  key={step.num}
                  style={{
                    background: "white",
                    border: "3px solid #1a1008",
                    boxShadow: "3px 3px 0 #1a1008",
                    padding: "20px 12px",
                    textAlign: "center",
                  }}
                >
                  <span
                    className="lp-heading"
                    style={{ fontSize: "2rem", color: "#e8392a" }}
                  >
                    {step.num}
                  </span>
                  <p
                    className="lp-body-font"
                    style={{
                      fontSize: "0.85rem",
                      marginTop: 8,
                      whiteSpace: "pre-line",
                      lineHeight: 1.5,
                    }}
                  >
                    {step.text}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 40 }}>
              <a href={LINE_URL} target="_blank" rel="noopener noreferrer" className="lp-btn">
                今すぐ無料で始める →
              </a>
            </div>
          </div>
        </section>

        {/* ── SECTION 6: Chapter 5 サブスクリプション ── */}
        <section
          ref={addRevealRef}
          className="lp-reveal"
          style={{
            background: "#1a1008",
            padding: "80px 20px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* 放射状パターン */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.04,
              background:
                "radial-gradient(circle at 50% 50%, #f5c842 0%, transparent 70%)",
              zIndex: 0,
            }}
          />
          <div
            style={{
              position: "relative",
              zIndex: 1,
              maxWidth: 1000,
              margin: "0 auto",
              textAlign: "center",
            }}
          >
            <div className="lp-chapter-header" style={{ justifyContent: "center", display: "flex" }}>
              <div className="lp-chapter-num">CHAPTER 5</div>
              <div className="lp-chapter-title">プランを選ぼう</div>
            </div>

            <h2
              className="lp-heading"
              style={{
                color: "#f5c842",
                fontSize: "clamp(1.5rem, 4vw, 2.2rem)",
                textShadow: "0 0 30px rgba(245,200,66,0.3)",
                marginBottom: 8,
              }}
            >
              プランを選ぼう
            </h2>
            <p
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "0.95rem",
                marginBottom: 40,
              }}
            >
              7日間の無料体験後、続けたいプランを選択
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 20,
                alignItems: "stretch",
              }}
              className="lp-sp-stack-3"
            >
              {PLANS.map((plan) => (
                <div
                  key={plan.key}
                  style={{
                    background: plan.featured ? "#f5c842" : "#fffef5",
                    border: `${plan.featured ? 4 : 3}px solid #1a1008`,
                    boxShadow: "6px 6px 0 #1a1008",
                    padding: "32px 24px",
                    textAlign: "left",
                    position: "relative",
                    transform: plan.featured ? "scale(1.03)" : undefined,
                    transition: "transform 0.2s, box-shadow 0.2s",
                  }}
                >
                  {plan.badge && (
                    <span
                      className="lp-heading"
                      style={{
                        position: "absolute",
                        top: -14,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "#e8392a",
                        color: "white",
                        fontSize: "0.75rem",
                        padding: "4px 16px",
                        border: "2px solid #1a1008",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {plan.badge}
                    </span>
                  )}
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "#e8392a",
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    7日間無料
                  </p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                    <span className="lp-heading" style={{ fontSize: "2rem" }}>
                      ¥{plan.price}
                    </span>
                    <span style={{ fontSize: "0.85rem", color: "#666" }}>/月</span>
                  </div>
                  <p className="lp-heading" style={{ fontSize: "1rem", marginBottom: 16 }}>
                    {plan.name}
                  </p>
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px" }}>
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        style={{
                          fontSize: "0.85rem",
                          padding: "4px 0",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span style={{ color: "#e8392a" }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/michelle/subscribe"
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "14px",
                      background: plan.featured ? "#e8392a" : "#1a1008",
                      color: plan.featured ? "white" : "#f5c842",
                      fontFamily: "'Dela Gothic One', cursive",
                      fontSize: "0.9rem",
                      border: "none",
                      textAlign: "center",
                      textDecoration: "none",
                      boxShadow: "3px 3px 0 rgba(26,16,8,0.3)",
                    }}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>

            <p
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: "0.8rem",
                marginTop: 32,
              }}
            >
              ※ 7日間無料体験後に料金が発生します。いつでもキャンセル可能。
            </p>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer
          style={{
            background: "#1a1008",
            borderTop: "3px solid #f5c842",
            padding: "32px 20px",
            textAlign: "center",
            color: "rgba(255,255,255,0.6)",
            fontSize: "0.8rem",
          }}
        >
          <p style={{ marginBottom: 12 }}>
            © 2025 ミシェルAI — テープ式心理学 | namisapo.app
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
            <Link href="/terms" style={{ color: "#f5c842", textDecoration: "none" }}>
              利用規約
            </Link>
            <Link href="/privacy" style={{ color: "#f5c842", textDecoration: "none" }}>
              プライバシーポリシー
            </Link>
            <Link href="/" style={{ color: "#f5c842", textDecoration: "none" }}>
              かんじょうにっきトップ
            </Link>
          </div>
        </footer>
      </div>

      {/* レスポンシブスタイル */}
      <style jsx global>{`
        @media (max-width: 767px) {
          .lp-sp-stack {
            grid-template-columns: 1fr !important;
          }
          .lp-sp-stack .lp-sp-border-fix {
            border-right: none !important;
            border-bottom: 3px solid #1a1008 !important;
          }
          .lp-sp-stack-3 {
            grid-template-columns: 1fr !important;
          }
          .lp-sp-stack-4 {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </>
  );
}
