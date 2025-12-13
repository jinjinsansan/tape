export default function TermsPage() {
  const sections = [
    {
      title: "第1条（適用）",
      body: "本規約は、テープ式心理学サービス（以下「本サービス」）の利用条件を定めるものです。利用者は本規約に同意のうえ、本サービスを利用するものとします。"
    },
    {
      title: "第2条（アカウント管理）",
      body: "利用者は登録情報を正確に保ち、第三者に共有・譲渡してはなりません。アカウントの不正利用によって生じた損害について、当社は故意または重過失がない限り責任を負いません。"
    },
    {
      title: "第3条（禁止事項）",
      body: "他者を誹謗中傷する行為、法令や公序良俗に反する行為、本サービスの運営を妨げる行為などを禁止します。"
    },
    {
      title: "第4条（サービス提供の停止等）",
      body: "当社は、システム保守や不可抗力により本サービスの提供を一時停止または終了する場合があります。これに伴い利用者に生じた損害について、当社は責任を負いません。"
    },
    {
      title: "第5条（免責）",
      body: "本サービスは心理的サポートを目的としていますが、医療行為ではありません。必要に応じて専門医療機関の受診をご検討ください。"
    }
  ];

  return (
    <main className="min-h-screen bg-tape-cream px-4 py-12 md:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2 text-center">
          <p className="text-xs font-semibold tracking-[0.4em] text-tape-light-brown">TERMS</p>
          <h1 className="text-3xl font-bold text-tape-brown">利用規約</h1>
          <p className="text-sm text-tape-light-brown">本サービスをご利用いただく前に、必ず本規約をお読みください。</p>
        </header>

        <section className="rounded-3xl border border-tape-beige bg-white p-6 shadow-sm space-y-6 text-sm text-tape-brown">
          {sections.map((section) => (
            <article key={section.title} className="space-y-2">
              <h2 className="text-base font-semibold text-tape-brown">{section.title}</h2>
              <p className="leading-relaxed text-tape-brown/90">{section.body}</p>
            </article>
          ))}
          <p className="text-xs text-tape-light-brown">最終更新日: 2024年12月13日</p>
        </section>
      </div>
    </main>
  );
}
