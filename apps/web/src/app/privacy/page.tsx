export default function PrivacyPage() {
  const sections = [
    {
      title: "1. 取得する情報",
      body: "メールアドレス、プロフィール情報、日記やチャットの内容、アクセスログなど、サービス提供に必要な最小限の情報を取得します。"
    },
    {
      title: "2. 利用目的",
      body: "本人確認、コンテンツのパーソナライズ、機能改善、お問い合わせ対応、法令遵守のために個人情報を利用します。"
    },
    {
      title: "3. 第三者提供",
      body: "法令に基づく場合やサービス運営に必要な委託先への提供を除き、ご本人の同意なく第三者に提供することはありません。"
    },
    {
      title: "4. 安全管理",
      body: "適切なアクセス制限と暗号化を行い、個人情報の漏えいや改ざんを防止します。"
    },
    {
      title: "5. お問い合わせ",
      body: "開示・訂正・削除のご希望は、お問い合わせフォームまたは公式LINEよりご連絡ください。"
    }
  ];

  return (
    <main className="min-h-screen bg-tape-cream px-4 py-12 md:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2 text-center">
          <p className="text-xs font-semibold tracking-[0.4em] text-tape-light-brown">PRIVACY</p>
          <h1 className="text-3xl font-bold text-tape-brown">プライバシーポリシー</h1>
          <p className="text-sm text-tape-light-brown">個人情報の取り扱い方針についてご説明します。</p>
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
