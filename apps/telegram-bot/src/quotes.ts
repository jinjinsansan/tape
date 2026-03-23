/** 名言データベース — 5大ネガティブ感情 + 罪悪感 に対応する気づきの名言 */

export type QuoteCategory =
  | "worthless"  // 無価値感
  | "lonely"     // 寂しさ
  | "fear"       // 恐怖
  | "anger"      // 怒り
  | "sadness"    // 悲しみ
  | "guilt";     // 罪悪感

export type QuoteType = "anime" | "manga" | "song" | "movie";

export interface Quote {
  id: string;
  text: string;
  source: string;
  character?: string;
  category: QuoteCategory;
  type: QuoteType;
}

export const QUOTES: Quote[] = [
  // ===== 無価値感 (worthless) =====
  { id: "w001", text: "諦めたらそこで試合終了ですよ", source: "スラムダンク", character: "安西先生", category: "worthless", type: "manga" },
  { id: "w002", text: "人にできて、きみだけにできないなんてことあるもんか", source: "ドラえもん", character: "ドラえもん", category: "worthless", type: "anime" },
  { id: "w003", text: "いちばんいけないのは自分なんかダメだと思い込むことだよ", source: "ドラえもん", character: "のび太", category: "worthless", type: "anime" },
  { id: "w004", text: "お前はお前でいい", source: "ドラゴンボール", character: "孫悟空", category: "worthless", type: "anime" },
  { id: "w005", text: "弱さは罪じゃない。諦めることが罪なんだ", source: "進撃の巨人", character: "エルヴィン", category: "worthless", type: "anime" },
  { id: "w006", text: "その痛みを知っているから、強くなれる", source: "NARUTO", character: "うずまきナルト", category: "worthless", type: "anime" },
  { id: "w007", text: "己自身を認めてやることができない奴は失敗する", source: "NARUTO", character: "うちはイタチ", category: "worthless", type: "anime" },
  { id: "w008", text: "俺が信じるお前でもない。お前が信じる俺でもない。お前が信じる、お前を信じろ！", source: "天元突破グレンラガン", character: "カミナ", category: "worthless", type: "anime" },
  { id: "w009", text: "走れなくなっても、歩けばいい", source: "ちはやふる", character: "綿谷新", category: "worthless", type: "manga" },
  { id: "w010", text: "どんな場所でも生きていける。だって私は私だから", source: "カードキャプターさくら", character: "木之本桜", category: "worthless", type: "anime" },
  { id: "w011", text: "生きてるだけで、偉いんだよ", source: "クレヨンしんちゃん", character: "野原しんのすけ", category: "worthless", type: "anime" },
  { id: "w012", text: "俺は俺のままでいいんだ", source: "四月は君の嘘", character: "有馬公生", category: "worthless", type: "anime" },
  { id: "w013", text: "才能がないなら、努力で埋めるしかない", source: "ハイキュー!!", character: "日向翔陽", category: "worthless", type: "anime" },
  { id: "w014", text: "胸を張って生きろ。己の弱さや不甲斐なさにどれだけ打ちのめされようと、心を燃やせ。歯を食いしばって前を向け", source: "鬼滅の刃", character: "煉獄杏寿郎", category: "worthless", type: "anime" },
  { id: "w015", text: "これでいいのだ", source: "天才バカボン", character: "バカボンのパパ", category: "worthless", type: "anime" },
  { id: "w016", text: "自分は自分らしい方法で頑張ればいい", source: "くまのプーさん", character: "くまのプーさん", category: "worthless", type: "anime" },
  { id: "w017", text: "何が嫌いかより、何が好きかで自分を語れよ！！", source: "ワンピース", character: "ルフィ", category: "worthless", type: "anime" },

  // ===== 寂しさ (lonely) =====
  { id: "l001", text: "ひとりじゃないから", source: "ZARD", category: "lonely", type: "song" },
  { id: "l002", text: "誰かのそばにいるだけで、救われることがある", source: "あの日見た花の名前を僕達はまだ知らない", character: "めんま", category: "lonely", type: "anime" },
  { id: "l003", text: "会いたいと思う人がいるだけで、生きていける", source: "夏目友人帳", character: "夏目貴志", category: "lonely", type: "anime" },
  { id: "l004", text: "孤独は、自分と向き合う時間でもある", source: "魔女の宅急便", character: "キキ", category: "lonely", type: "movie" },
  { id: "l005", text: "たとえ遠く離れていても、心はつながっている", source: "君の名は。", category: "lonely", type: "movie" },
  { id: "l006", text: "一人でいることと、孤独であることは違う", source: "風の谷のナウシカ", character: "ナウシカ", category: "lonely", type: "movie" },
  { id: "l007", text: "一番いけないのは、お腹が空いていることと、一人でいることだから", source: "サマーウォーズ", character: "陣内栄", category: "lonely", type: "movie" },
  { id: "l008", text: "独りぼっちは、寂しいもんな…。いいよ、一緒にいてやるよ", source: "魔法少女まどか☆マギカ", character: "佐倉杏子", category: "lonely", type: "anime" },
  { id: "l009", text: "寂しいとき、空を見上げれば同じ空の下に誰かいる", source: "ドラえもん", character: "のび太", category: "lonely", type: "anime" },
  { id: "l010", text: "誰も分かってくれなくていい。私は私を分かっている", source: "少女革命ウテナ", character: "ウテナ", category: "lonely", type: "anime" },
  { id: "l011", text: "そばにいるよ 君のために出来ることが 僕にあるかな", source: "そばにいるよ", character: "天海祐希", category: "lonely", type: "song" },
  { id: "l012", text: "迷惑なんかじゃないです。離れて心配するくらいなら、一緒に苦労したいんです。だってそれが友達じゃないですか", source: "とある科学の超電磁砲", character: "佐天涙子", category: "lonely", type: "anime" },

  // ===== 恐怖 (fear) =====
  { id: "f001", text: "前に進むことを恐れていたら、何も始まらない", source: "進撃の巨人", character: "エルヴィン", category: "fear", type: "anime" },
  { id: "f002", text: "怖いと思うから、勇気が生まれる", source: "ワンピース", character: "エース", category: "fear", type: "anime" },
  { id: "f003", text: "変わることが怖いのは、今の自分を大切にしているから", source: "エヴァンゲリオン", character: "碇シンジ", category: "fear", type: "anime" },
  { id: "f004", text: "知らない道を歩くから、新しい景色が見える", source: "千と千尋の神隠し", character: "千尋", category: "fear", type: "movie" },
  { id: "f005", text: "迷わないことが強さじゃなくて、怖がらないことが強さじゃなくて…本当の強さって、どんなことがあっても、前をむけること", source: "ムーミン", character: "リトルミイ", category: "fear", type: "anime" },
  { id: "f006", text: "不安はゼロにならない。でも、不安を抱えたまま進める", source: "ヴァイオレット・エヴァーガーデン", character: "ヴァイオレット", category: "fear", type: "anime" },
  { id: "f007", text: "心配しすぎは、起きてもいないことを二度苦しむことだ", source: "銀魂", character: "坂田銀時", category: "fear", type: "anime" },
  { id: "f008", text: "決まってんだろ、勇者の武器は勇気だよ", source: "ダイの大冒険", character: "マトリフ", category: "fear", type: "manga" },
  { id: "f009", text: "びびったって無駄じゃん。だから弱気はかっ飛ばす！", source: "とらドラ！", character: "櫛枝実乃梨", category: "fear", type: "anime" },
  { id: "f010", text: "逃げちゃダメだ、逃げちゃダメだ、逃げちゃダメだ", source: "新世紀エヴァンゲリオン", character: "碇シンジ", category: "fear", type: "anime" },
  { id: "f011", text: "負けることが怖くて勝負できない人間に、勝ち目なんてないわよ", source: "NANA", character: "大崎ナナ", category: "fear", type: "manga" },

  // ===== 怒り (anger) =====
  { id: "a001", text: "人を憎み続けるには、人生は短すぎる", source: "銀魂", character: "坂田銀時", category: "anger", type: "anime" },
  { id: "a002", text: "憎しみの連鎖を断ち切れるのは、愛だけだ", source: "NARUTO", character: "うちはイタチ", category: "anger", type: "anime" },
  { id: "a003", text: "怒りは力だ。でも、方向を間違えると自分を燃やす", source: "鬼滅の刃", character: "不死川実弥", category: "anger", type: "anime" },
  { id: "a004", text: "許すことは、相手のためじゃない。自分のためだ", source: "ワンピース", character: "ロビン", category: "anger", type: "anime" },
  { id: "a005", text: "怒りの奥には、必ず傷ついた心がある", source: "テープ式心理学", category: "anger", type: "manga" },
  { id: "a006", text: "感情をぶつけることと、伝えることは違う", source: "僕のヒーローアカデミア", character: "爆豪勝己", category: "anger", type: "anime" },
  { id: "a007", text: "その人を知りたければ、その人が何に対して怒りを感じるかを知れ", source: "HUNTER×HUNTER", character: "ゴン", category: "anger", type: "manga" },
  { id: "a008", text: "間違っていたのは俺じゃない、世界の方だ", source: "コードギアス", character: "ルルーシュ", category: "anger", type: "anime" },

  // ===== 悲しみ (sadness) =====
  { id: "s001", text: "泣きたいときは泣いていいんだよ。涙は心の洗濯だから", source: "ドラえもん", character: "ドラえもん", category: "sadness", type: "anime" },
  { id: "s002", text: "悲しみを知っている人は、人の痛みがわかる優しい人になれる", source: "NARUTO", character: "我愛羅", category: "sadness", type: "anime" },
  { id: "s003", text: "涙の数だけ強くなれるよ", source: "TOMORROW", character: "岡本真夜", category: "sadness", type: "song" },
  { id: "s004", text: "誰からも必要とされていないのが、この世で一番の苦しみだ", source: "闇金ウシジマくん", character: "丑嶋馨", category: "sadness", type: "manga" },
  { id: "s005", text: "そんな日もあるよね", source: "クレヨンしんちゃん", character: "野原しんのすけ", category: "sadness", type: "anime" },
  { id: "s006", text: "傷つき迷える者たちへ…敗北とは、傷つき倒れることではありません。そうした時に、自分を見失った時のことを言うのです", source: "ダイの大冒険", character: "アバン", category: "sadness", type: "manga" },
  { id: "s007", text: "負けたことがある、というのがいつか大きな財産になる", source: "スラムダンク", character: "堂本五郎", category: "sadness", type: "manga" },
  { id: "s008", text: "まっすぐ走ってきたつもりがいつの間にか泥だらけだ。だがそれでも一心不乱に突っ走ってりゃ、いつか泥も乾いて落ちんだろ", source: "銀魂", character: "坂田銀時", category: "sadness", type: "anime" },
  { id: "s009", text: "明日がある 明日がある 明日があるさ", source: "明日があるさ", character: "坂本九", category: "sadness", type: "song" },

  // ===== 罪悪感 (guilt) =====
  { id: "g001", text: "あなたが幸せになることを、あの人も望んでいる", source: "あの日見た花の名前を僕達はまだ知らない", character: "めんま", category: "guilt", type: "anime" },
  { id: "g002", text: "過去は変えられない。でも、過去の意味は変えられる", source: "スチールボールラン", character: "ジャイロ", category: "guilt", type: "manga" },
  { id: "g003", text: "間違えたっていい。また立ち上がればいい", source: "魔法少女まどか☆マギカ", character: "暁美ほむら", category: "guilt", type: "anime" },
  { id: "g004", text: "幸せになることは、裏切りじゃない", source: "僕だけがいない街", character: "藤沼悟", category: "guilt", type: "anime" },
  { id: "g005", text: "自分を責めすぎる人は、それだけ誠実な人だ", source: "夏目友人帳", character: "夏目貴志", category: "guilt", type: "anime" },
  { id: "g006", text: "ごめんなさいと言える人は、愛を知っている人だ", source: "CLANNAD", character: "古河渚", category: "guilt", type: "anime" },
  { id: "g007", text: "過ぎたことを悔やんでも、しょうがないじゃないか", source: "ドラえもん", character: "ドラえもん", category: "guilt", type: "anime" },
  { id: "g008", text: "逃げた事を卑下しないで、それをプラスに変えてこそ意味がある", source: "銀の匙", character: "校長", category: "guilt", type: "manga" },
  { id: "g009", text: "自分を憐むな…自分を憐めば人生は終りなき悪夢だよ", source: "文豪ストレイドッグス", character: "太宰治", category: "guilt", type: "anime" },
  { id: "g010", text: "自分が死ぬ時のことはわからんけど、生き様で後悔はしたくない", source: "呪術廻戦", character: "虎杖悠仁", category: "guilt", type: "anime" },
];

// ── 名言取得関数 ────────────────────────────────

const CATEGORY_MAP: Record<string, QuoteCategory> = {
  "無価値感": "worthless",
  "寂しさ": "lonely",
  "恐怖": "fear",
  "怒り": "anger",
  "悲しみ": "sadness",
  "罪悪感": "guilt",
};

/**
 * カテゴリに合った名言をランダムに返す。
 * categoryは日本語（「無価値感」等）または英語キー（"worthless"等）で指定可能。
 */
export function getQuoteByCategory(category: string): Quote | null {
  const normalized = CATEGORY_MAP[category] ?? category;
  const matches = QUOTES.filter((q) => q.category === normalized);
  if (matches.length === 0) return null;
  return matches[Math.floor(Math.random() * matches.length)];
}

/**
 * 名言をフォーマットして返す。
 * 例: 「諦めたらそこで試合終了ですよ」— 安西先生（スラムダンク）
 */
export function formatQuote(quote: Quote): string {
  const source = quote.character
    ? `${quote.character}（${quote.source}）`
    : `${quote.source}`;
  return `「${quote.text}」— ${source}`;
}
