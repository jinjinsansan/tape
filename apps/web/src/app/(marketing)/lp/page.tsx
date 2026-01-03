import Link from "next/link";
import { BookHeart, Bot, PlayCircle, Check, Star, ArrowRight, Sparkles, Heart, Brain, TrendingUp } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 text-center md:py-32">
        <div className="absolute inset-0 -z-10 opacity-30">
          <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-tape-pink blur-3xl" />
          <div className="absolute right-1/4 top-1/3 h-96 w-96 rounded-full bg-tape-blue blur-3xl" />
        </div>
        
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-tape-brown shadow-sm backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-tape-pink" />
            あなたの感情は、もっと自由になれる
          </div>
          
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-tape-brown md:text-7xl">
            心の痛みを<br />
            言葉にして、<br />
            <span className="bg-gradient-to-r from-tape-pink to-tape-blue bg-clip-text text-transparent">
              本当の自分と出会う
            </span>
          </h1>
          
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-tape-light-brown md:text-xl">
            感情日記、AIカウンセリング、専門的な動画コース。<br />
            テープ式心理学があなたの内面の成長を、やさしくサポートします。
          </p>
          
          <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
            <Link
              href="/diary"
              className="group flex w-full items-center justify-center gap-2 rounded-full bg-tape-brown px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl sm:w-auto"
            >
              今すぐ無料で始める
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="#features"
              className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-tape-brown bg-white px-8 py-4 text-lg font-bold text-tape-brown transition-all hover:bg-tape-beige sm:w-auto"
            >
              機能を見る
            </Link>
          </div>
          
          <p className="text-sm text-tape-light-brown">
            ✓ クレジットカード不要　✓ 3分で始められる　✓ いつでも解約OK
          </p>
        </div>
      </section>

      {/* Problem Section */}
      <section className="bg-white/50 px-4 py-20 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-tape-brown md:text-4xl">
              こんな悩み、抱えていませんか？
            </h2>
            <p className="text-tape-light-brown">
              一つでも当てはまるなら、Tapeがあなたの力になれます
            </p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              "感情をうまく言葉にできない",
              "人間関係でいつも同じパターンで傷つく",
              "過去のトラウマから抜け出せない",
              "恋愛で同じ失敗を繰り返してしまう",
              "自分に自信が持てない",
              "漠然とした不安や孤独を感じる",
              "頑張りすぎて心が疲れている",
              "本当の自分がわからなくなっている",
              "誰にも相談できない悩みがある",
              "変わりたいのに、変われない自分がいる",
            ].map((problem, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-2xl bg-white p-6 shadow-sm transition-all hover:shadow-md"
              >
                <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-tape-pink" />
                <p className="text-tape-brown">{problem}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-lg font-medium text-tape-brown">
              これらは、あなたが悪いのではありません。<br />
              <span className="text-tape-pink">心の仕組みを知らないだけ</span>なのです。
            </p>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="features" className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-tape-brown md:text-4xl">
              テープ式心理学の3つの柱
            </h2>
            <p className="text-tape-light-brown">
              書く、話す、学ぶ。3つのアプローチで、確実に変化を実感できます
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3">
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#fdeef1] to-white p-8 shadow-lg transition-all hover:scale-105 hover:shadow-2xl">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md">
                <BookHeart className="h-8 w-8 text-tape-pink" />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-tape-brown">感情日記</h3>
              <p className="mb-4 leading-relaxed text-tape-light-brown">
                今の気持ちを書くだけ。AIがあなたの感情を分析し、気づきを与えてくれます。
              </p>
              <ul className="space-y-2 text-sm text-tape-brown">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-tape-pink" />
                  感情の可視化
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-tape-pink" />
                  AIによる深い気づき
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-tape-pink" />
                  継続できる仕組み
                </li>
              </ul>
            </div>
            
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#eef7f3] to-white p-8 shadow-lg transition-all hover:scale-105 hover:shadow-2xl">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md">
                <Bot className="h-8 w-8 text-tape-green" />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-tape-brown">Michelle AI</h3>
              <p className="mb-4 leading-relaxed text-tape-light-brown">
                24時間いつでも相談できるAIパートナー。テープ式心理学の知識で、あなたをサポート。
              </p>
              <ul className="space-y-2 text-sm text-tape-brown">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  恋愛・人生・人間関係
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  89の専門知識ベース
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  判断せず、寄り添う対話
                </li>
              </ul>
            </div>
            
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#fff0e7] to-white p-8 shadow-lg transition-all hover:scale-105 hover:shadow-2xl">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md">
                <PlayCircle className="h-8 w-8 text-tape-orange" />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-tape-brown">動画コース</h3>
              <p className="mb-4 leading-relaxed text-tape-light-brown">
                心の仕組みを体系的に学ぶ。初心者から上級者まで、段階的に成長できます。
              </p>
              <ul className="space-y-2 text-sm text-tape-brown">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-tape-orange" />
                  体系的なカリキュラム
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-tape-orange" />
                  実践的なワーク付き
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-tape-orange" />
                  自分のペースで学習
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Transformation Journey */}
      <section className="bg-gradient-to-b from-white/50 to-transparent px-4 py-20 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-tape-brown md:text-4xl">
              3ヶ月で、確実に変わる
            </h2>
            <p className="text-tape-light-brown">
              自己理解が深まり、感情との付き合い方が変わります
            </p>
          </div>
          
          <div className="space-y-8">
            <div className="flex flex-col items-start gap-6 rounded-3xl bg-white p-8 shadow-lg md:flex-row md:items-center">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-tape-pink to-tape-orange text-2xl font-bold text-white shadow-md">
                1
              </div>
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Heart className="h-5 w-5 text-tape-pink" />
                  <h3 className="text-xl font-bold text-tape-brown">感情の言語化（1ヶ月目）</h3>
                </div>
                <p className="text-tape-light-brown">
                  感情日記とAIチャットで、モヤモヤしていた気持ちが言葉になり始めます。「なんとなく辛い」が「寂しさだった」と気づく瞬間。
                </p>
              </div>
            </div>
            
            <div className="flex flex-col items-start gap-6 rounded-3xl bg-white p-8 shadow-lg md:flex-row md:items-center">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-tape-blue to-tape-green text-2xl font-bold text-white shadow-md">
                2
              </div>
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-tape-blue" />
                  <h3 className="text-xl font-bold text-tape-brown">パターンの理解（2ヶ月目）</h3>
                </div>
                <p className="text-tape-light-brown">
                  動画コースで心の仕組みを学び、「なぜいつも同じ失敗をするのか」が腑に落ちます。自分を責めるのではなく、理解する視点へ。
                </p>
              </div>
            </div>
            
            <div className="flex flex-col items-start gap-6 rounded-3xl bg-white p-8 shadow-lg md:flex-row md:items-center">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-tape-lavender to-tape-pink text-2xl font-bold text-white shadow-md">
                3
              </div>
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-tape-lavender" />
                  <h3 className="text-xl font-bold text-tape-brown">新しい選択（3ヶ月目）</h3>
                </div>
                <p className="text-tape-light-brown">
                  感情に振り回されるのではなく、「今、どうしたいか」を選べるようになります。人間関係も、自分との関係も、確実に変わります。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Authority Section */}
      <section className="bg-gradient-to-b from-white/80 to-transparent px-4 py-20 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-3xl font-bold text-tape-brown md:text-4xl">
            テープ式心理学とは
          </h2>
          <div className="rounded-3xl bg-white p-8 shadow-xl md:p-12">
            <p className="mb-6 text-lg leading-relaxed text-tape-brown">
              従来の心理学を、<span className="font-bold text-tape-pink">もっと身近に、もっと実践的に</span>。
            </p>
            <p className="mb-8 leading-relaxed text-tape-light-brown">
              テープ式心理学は、トラウマ理論、愛着理論、認知行動療法などの科学的根拠に基づきながら、
              日常で実践できる形に落とし込んだ独自のメソッドです。<br />
              「心の仕組みを知る」「感情を言語化する」「新しい選択をする」という3つのステップで、
              誰でも確実に変化を実感できる設計になっています。
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="rounded-full bg-tape-beige px-6 py-2 text-sm font-medium text-tape-brown">
                トラウマケア
              </div>
              <div className="rounded-full bg-tape-beige px-6 py-2 text-sm font-medium text-tape-brown">
                愛着理論
              </div>
              <div className="rounded-full bg-tape-beige px-6 py-2 text-sm font-medium text-tape-brown">
                感情の言語化
              </div>
              <div className="rounded-full bg-tape-beige px-6 py-2 text-sm font-medium text-tape-brown">
                自己理解
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white/50 px-4 py-20 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-tape-brown md:text-4xl">
              よくある質問
            </h2>
          </div>
          
          <div className="space-y-6">
            {[
              {
                q: "本当に効果がありますか？",
                a: "テープ式心理学は科学的根拠に基づいたメソッドです。感情日記による言語化、AIとの対話、体系的な学習という3つのアプローチで、多くの方が3ヶ月以内に変化を実感しています。"
              },
              {
                q: "AIに相談するのは不安です",
                a: "ミシェルAIは89の専門知識ベースを持ち、テープ式心理学に基づいた対話を行います。判断せず、あなたに寄り添う姿勢を大切にしています。また、必要に応じて人間のカウンセラーにも相談できます。"
              },
              {
                q: "途中で解約できますか？",
                a: "はい、いつでも解約できます。違約金や解約手数料は一切かかりません。あなたのペースで、必要な期間だけご利用ください。"
              },
              {
                q: "無料プランだけでも効果はありますか？",
                a: "はい。感情日記を継続するだけでも、感情の言語化と自己理解は深まります。まずは無料から始めて、必要に応じてステップアップすることをおすすめします。"
              },
              {
                q: "精神疾患の治療に使えますか？",
                a: "Tapeは自己理解と感情ケアをサポートするサービスです。医療行為ではないため、精神疾患の診断や治療が必要な場合は、必ず専門医にご相談ください。"
              },
            ].map((faq, index) => (
              <details
                key={index}
                className="group rounded-2xl bg-white p-6 shadow-sm transition-all hover:shadow-md"
              >
                <summary className="cursor-pointer text-lg font-bold text-tape-brown">
                  {faq.q}
                </summary>
                <p className="mt-4 leading-relaxed text-tape-light-brown">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="rounded-3xl bg-gradient-to-br from-tape-pink via-tape-blue to-tape-lavender p-1 shadow-2xl">
            <div className="rounded-3xl bg-white p-12">
              <h2 className="mb-6 text-3xl font-bold text-tape-brown md:text-4xl">
                今日から、新しい自分と出会う
              </h2>
              <p className="mb-8 text-lg leading-relaxed text-tape-light-brown">
                感情を言葉にして、心の仕組みを知り、<br />
                あなたらしい選択ができるようになる。<br />
                <span className="font-bold text-tape-brown">その第一歩を、今、踏み出しませんか？</span>
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/diary"
                  className="group flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-tape-pink to-tape-orange px-10 py-5 text-xl font-bold text-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl sm:w-auto"
                >
                  無料で今すぐ始める
                  <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
              <p className="mt-6 text-sm text-tape-light-brown">
                ✓ 3分で登録完了　✓ クレジットカード不要　✓ いつでも解約OK
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-tape-beige bg-white/80 px-4 py-12 text-center backdrop-blur-sm">
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 text-2xl font-bold text-tape-brown">テープ式心理学</p>
          <p className="mb-6 text-sm text-tape-light-brown">
            心に寄り添う、やさしい場所
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-tape-light-brown">
            <Link href="/terms" className="hover:text-tape-brown">
              利用規約
            </Link>
            <Link href="/privacy" className="hover:text-tape-brown">
              プライバシーポリシー
            </Link>
          </div>
          <p className="mt-8 text-xs text-tape-light-brown">
            © 2024 テープ式心理学. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
