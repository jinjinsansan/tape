export type AssessmentPath = "teen" | "adult" | "senior";

export type BranchJump =
  | number
  | "end"
  | "disclaimer"
  | "age_restriction"
  | "adult_path"
  | "teen_path"
  | "senior_path";

export type AssessmentQuestion = {
  id: number;
  text: string;
  helper?: string;
  type: "single" | "multiple" | "input";
  options?: {
    text: string;
    points: number;
    nextQuestion?: BranchJump;
  }[];
  nextQuestion?: BranchJump;
};

const teenQuestions: AssessmentQuestion[] = [
  {
    id: 1,
    text: "あなたがしっくりくる性の在り方を選んでください",
    type: "single",
    options: [
      { text: "男性として暮らしている", points: 0, nextQuestion: 2 },
      { text: "女性として暮らしている", points: 0, nextQuestion: 2 },
      { text: "どれにも当てはまらない/話したくない", points: 0, nextQuestion: 2 }
    ]
  },
  {
    id: 2,
    text: "今の年代を教えてください",
    type: "single",
    options: [
      { text: "10歳未満", points: 0, nextQuestion: "age_restriction" },
      { text: "10代", points: 0, nextQuestion: 3 },
      { text: "20〜50代", points: 0, nextQuestion: "adult_path" },
      { text: "60代以上", points: 0, nextQuestion: "senior_path" }
    ]
  },
  {
    id: 3,
    text: "いま一緒に暮らしている人との距離感を教えてください",
    type: "single",
    options: [
      { text: "保護者ふたりと暮らしていて落ち着いている", points: 0, nextQuestion: 4 },
      { text: "主に母親/パートナー的な人と暮らしている", points: 5, nextQuestion: 4 },
      { text: "主に父親/もう一人の保護者と暮らしている", points: 7, nextQuestion: 4 },
      { text: "親族以外の大人と暮らしている", points: 10, nextQuestion: 4 },
      { text: "今は家を離れて生活している", points: 10, nextQuestion: 4 }
    ]
  },
  {
    id: 4,
    text: "学校や学びの場での過ごし方に近いものを選んでください",
    type: "single",
    options: [
      { text: "普通に通えていて特に困りごとはない", points: 0, nextQuestion: 5 },
      { text: "通っているが、人間関係で強いストレスを感じている", points: 10, nextQuestion: 5 },
      { text: "しばらく通えていない/オンラインのみ", points: 7, nextQuestion: 5 },
      { text: "学校が楽しくモチベーションも高い", points: -4, nextQuestion: 5 }
    ]
  },
  {
    id: 5,
    text: "主にケアしてくれる大人との関係で当てはまるものは？",
    type: "single",
    options: [
      { text: "とても大切にされ安心している", points: 0, nextQuestion: 6 },
      { text: "厳しさもあるが信頼できる", points: 0, nextQuestion: 6 },
      { text: "口調がきつく心が休まらない", points: 7, nextQuestion: 6 },
      { text: "生活面のサポートがほとんどない", points: 7, nextQuestion: 6 },
      { text: "家での言い合いが絶えない", points: 7, nextQuestion: 6 },
      { text: "否定的な言葉を浴びることが多い", points: 7, nextQuestion: 6 },
      { text: "大きな声や手が出ることがある", points: 10, nextQuestion: 6 },
      { text: "一緒に暮らしておらず状況がわからない", points: 5, nextQuestion: 6 },
      { text: "きょうだい等と比べられてしまう", points: 7, nextQuestion: 6 },
      { text: "愛情を感じられず孤独だ", points: 10, nextQuestion: 6 },
      { text: "家に自分の居場所がない気がする", points: 10, nextQuestion: 6 }
    ]
  },
  {
    id: 6,
    text: "友達や恋人など、心の支えについて教えてください",
    type: "single",
    options: [
      { text: "悩みを安心して話せる大親友やパートナーがいる", points: -2, nextQuestion: 7 },
      { text: "友達はいるが深い話まではしない", points: 7, nextQuestion: 7 },
      { text: "恋人はいるが距離を感じる", points: 7, nextQuestion: 7 },
      { text: "つらさを共有できる人が今はいない", points: 7, nextQuestion: 7 },
      { text: "オンラインでは交流があるがリアルはいない", points: 7, nextQuestion: 7 },
      { text: "一人でいる方が楽だと感じている", points: 7, nextQuestion: 7 }
    ]
  },
  {
    id: 7,
    text: "生きることや将来についての感覚に近いものは？",
    type: "single",
    options: [
      { text: "大変さはあるが叶えたい夢もある", points: -2, nextQuestion: 8 },
      { text: "深く考えたことはなく特別な想いもない", points: 0, nextQuestion: 8 },
      { text: "消えたい気持ちを抱えることが多い", points: 7, nextQuestion: 8 },
      { text: "危険な行動に移したことがある", points: 10, nextQuestion: 8 }
    ]
  },
  {
    id: 8,
    text: "いま頼りがちなもの・ハマっていることについて",
    type: "single",
    options: [
      { text: "特定の依存は感じていない", points: -2, nextQuestion: 9 },
      { text: "体に傷をつける/大量服薬に頼ることがある", points: 7, nextQuestion: 9 },
      { text: "動画・ゲーム・スマホに没頭しすぎる", points: 4, nextQuestion: 9 },
      { text: "夜の街や刺激的な場所に通いがち", points: 5, nextQuestion: 9 },
      { text: "誰かを攻撃してしまうことでバランスを取る", points: 5, nextQuestion: 9 },
      { text: "恋愛のドキドキに依存している", points: 3, nextQuestion: 9 },
      { text: "その他の対象に強く頼っている", points: 4, nextQuestion: 9 }
    ]
  },
  {
    id: 9,
    text: "心や体のケアで医療を利用した経験に近いもの",
    type: "single",
    options: [
      { text: "専門機関に通ったことはない", points: -2, nextQuestion: 10 },
      { text: "周りの勧めで受診したことがある", points: 5, nextQuestion: 10 },
      { text: "診断名を伝えられたことがある", points: 7, nextQuestion: 10 },
      { text: "受診歴はないが自分は不調だと思う", points: 5, nextQuestion: 10 }
    ]
  },
  {
    id: 10,
    text: "いじめやハラスメントの体験に最も近いものは？",
    type: "single",
    options: [
      { text: "家庭内で強い言葉や行為を受けている", points: 7, nextQuestion: 11 },
      { text: "家庭内で時々心が傷つく出来事がある", points: 5, nextQuestion: 11 },
      { text: "家でも学校でもプレッシャーが強い", points: 10, nextQuestion: 11 },
      { text: "家庭は平和だが学校では孤立している", points: 4, nextQuestion: 11 },
      { text: "大きなトラブルは特にない", points: -2, nextQuestion: 11 }
    ]
  },
  {
    id: 11,
    text: "自分の意見や感情との向き合いかたはどれが近い？",
    type: "single",
    options: [
      { text: "周りに合わせすぎて自分がわからなくなる", points: 7, nextQuestion: 12 },
      { text: "自分の意見を持ち行動できている", points: -2, nextQuestion: 12 },
      { text: "状況によって変わりまだ模索中", points: 4, nextQuestion: 12 }
    ]
  },
  {
    id: 12,
    text: "今日の自己肯定感を0〜100で表すと？",
    type: "input",
    nextQuestion: "disclaimer"
  }
];

const adultQuestions: AssessmentQuestion[] = [
  {
    id: 1,
    text: "あなたの性の在り方を教えてください",
    type: "single",
    options: [
      { text: "男性として暮らしている", points: 0, nextQuestion: 2 },
      { text: "女性として暮らしている", points: 0, nextQuestion: 2 },
      { text: "ラベルにこだわっていない/話したくない", points: 0, nextQuestion: 2 }
    ]
  },
  {
    id: 2,
    text: "今の年代を教えてください",
    type: "single",
    options: [
      { text: "10代以下", points: 0, nextQuestion: "age_restriction" },
      { text: "10代", points: 0, nextQuestion: "teen_path" },
      { text: "20〜50代", points: 0, nextQuestion: 3 },
      { text: "60代以上", points: 0, nextQuestion: "senior_path" }
    ]
  },
  {
    id: 3,
    text: "現在の暮らし方にいちばん近いものを選んでください",
    type: "single",
    options: [
      { text: "パートナーと子どもと暮らしている", points: 0, nextQuestion: 4 },
      { text: "パートナーと2人で暮らし子どもはいない", points: 0, nextQuestion: 4 },
      { text: "パートナーとどちらかの親と同居している", points: 7, nextQuestion: 4 },
      { text: "離婚後に別パートナーと暮らしている", points: 0, nextQuestion: 4 },
      { text: "離婚し一人暮らし", points: -2, nextQuestion: 4 },
      { text: "未婚で一人暮らし", points: -2, nextQuestion: 4 },
      { text: "未婚で実家暮らし", points: 5, nextQuestion: 4 },
      { text: "決まった住まいがない/転々としている", points: 7, nextQuestion: 4 }
    ]
  },
  {
    id: 4,
    text: "仕事やキャリアの状況を教えてください",
    type: "single",
    options: [
      { text: "安定して働けている", points: 0, nextQuestion: 5 },
      { text: "働いているが職場の人間関係がつらい", points: 7, nextQuestion: 5 },
      { text: "今は離職・休職中", points: 7, nextQuestion: 5 },
      { text: "仕事が楽しくやりがいがある", points: -2, nextQuestion: 5 },
      { text: "体調面の理由で働けていない", points: 7, nextQuestion: 5 }
    ]
  },
  {
    id: 5,
    text: "幼少期の記憶で近いものを選んでください",
    type: "single",
    options: [
      { text: "十分な愛情と安心を感じていた", points: 0, nextQuestion: 6 },
      { text: "厳しさもあったが支えられていた", points: 0, nextQuestion: 6 },
      { text: "厳しさや否定が多く苦しかった", points: 7, nextQuestion: 6 },
      { text: "生活面のケアが乏しかった", points: 7, nextQuestion: 6 },
      { text: "保護者同士の衝突が多かった", points: 7, nextQuestion: 6 },
      { text: "怒鳴り声や強い言葉が日常的だった", points: 7, nextQuestion: 6 },
      { text: "叩かれるなど身体的な痛みがあった", points: 10, nextQuestion: 6 },
      { text: "一緒に暮らしていないのでわからない", points: 5, nextQuestion: 6 },
      { text: "きょうだいと比較されて劣等感を感じた", points: 7, nextQuestion: 6 },
      { text: "愛情を受け取れず孤独だった", points: 10, nextQuestion: 6 },
      { text: "家に居場所がなかった", points: 10, nextQuestion: 6 }
    ]
  },
  {
    id: 6,
    text: "パートナー/恋人など親密な関係について",
    type: "single",
    options: [
      { text: "互いに尊重し支え合えている", points: -2, nextQuestion: 7 },
      { text: "本音を話せる関係性がある", points: -2, nextQuestion: 7 },
      { text: "同居しているが関係はギクシャク", points: 5, nextQuestion: 7 },
      { text: "別々に暮らしており関係はギクシャク", points: 5, nextQuestion: 7 },
      { text: "パートナーからモラハラ/暴力がある", points: 7, nextQuestion: 7 },
      { text: "空気のような存在で特に感情がない", points: 0, nextQuestion: 7 },
      { text: "自分が相手を追い詰めてしまう", points: 10, nextQuestion: 7 },
      { text: "頼れる人が誰もいない", points: 5, nextQuestion: 7 }
    ]
  },
  {
    id: 7,
    text: "生きる意欲や将来像について現在の感覚は？",
    type: "single",
    options: [
      { text: "困難はあるが夢や楽しみも持てている", points: -2, nextQuestion: 8 },
      { text: "命について考える機会は少ない", points: 0, nextQuestion: 8 },
      { text: "消えたい気持ちが心にいる", points: 7, nextQuestion: 8 },
      { text: "危険な行動を起こしたことがある", points: 10, nextQuestion: 8 }
    ]
  },
  {
    id: 8,
    text: "今頼りがちなもの/時間を使いすぎているもの",
    type: "single",
    options: [
      { text: "特に依存は感じていない", points: -2, nextQuestion: 9 },
      { text: "自傷や過度な服薬に頼ってしまう", points: 7, nextQuestion: 9 },
      { text: "ギャンブルにのめり込んでいる", points: 7, nextQuestion: 9 },
      { text: "お酒に頼る時間が多い", points: 7, nextQuestion: 9 },
      { text: "動画/ゲーム/スマホから離れられない", points: 4, nextQuestion: 9 },
      { text: "夜の街など刺激的な場所に通いがち", points: 5, nextQuestion: 9 },
      { text: "性に関わる刺激を求めすぎている", points: 5, nextQuestion: 9 },
      { text: "誰かを攻撃することで安定する", points: 5, nextQuestion: 9 },
      { text: "恋愛に依存してしまう", points: 3, nextQuestion: 9 },
      { text: "その他の対象に深く依存している", points: 4, nextQuestion: 9 }
    ]
  },
  {
    id: 9,
    text: "心のケアのために専門家を利用した経験",
    type: "single",
    options: [
      { text: "受診したことはない", points: -2, nextQuestion: 10 },
      { text: "受診歴はある", points: 5, nextQuestion: 10 },
      { text: "診断名を伝えられたことがある", points: 7, nextQuestion: 10 },
      { text: "現在も治療で通院し薬を服用している", points: 7, nextQuestion: 10 },
      { text: "未受診だが不調だと感じる", points: 5, nextQuestion: 10 },
      { text: "不調だと感じたことは一度もない", points: -4, nextQuestion: 10 }
    ]
  },
  {
    id: 10,
    text: "ハラスメントやいじめの状況を教えてください",
    type: "single",
    options: [
      { text: "家族から精神的・身体的なダメージを受けている", points: 7, nextQuestion: 11 },
      { text: "パートナーからモラハラ/暴力がある", points: 7, nextQuestion: 11 },
      { text: "職場でのいじめや嫌がらせがある", points: 6, nextQuestion: 11 },
      { text: "家庭でも職場でもプレッシャーが強い", points: 7, nextQuestion: 11 },
      { text: "大きなトラブルは特にない", points: -2, nextQuestion: 11 }
    ]
  },
  {
    id: 11,
    text: "自分の意思や感情との向き合い方",
    type: "single",
    options: [
      { text: "周囲に合わせがちで自分が後回しになる", points: 7, nextQuestion: 12 },
      { text: "自分の軸を持って行動できている", points: -2, nextQuestion: 12 },
      { text: "どちらでもなく揺れ動いている", points: 4, nextQuestion: 12 }
    ]
  },
  {
    id: 12,
    text: "今日の自己肯定感を0〜100で入力してください",
    type: "input",
    nextQuestion: "disclaimer"
  }
];

const seniorQuestions: AssessmentQuestion[] = [
  {
    id: 1,
    text: "あなたの性の在り方を教えてください",
    type: "single",
    options: [
      { text: "男性として暮らしている", points: 0, nextQuestion: 2 },
      { text: "女性として暮らしている", points: 0, nextQuestion: 2 },
      { text: "どれにもこだわっていない/話したくない", points: 0, nextQuestion: 2 }
    ]
  },
  {
    id: 2,
    text: "今の年代を教えてください",
    type: "single",
    options: [
      { text: "10代以下", points: 0, nextQuestion: "age_restriction" },
      { text: "10代", points: 0, nextQuestion: "teen_path" },
      { text: "20〜50代", points: 0, nextQuestion: "adult_path" },
      { text: "60代以上", points: 0, nextQuestion: 3 }
    ]
  },
  {
    id: 3,
    text: "今の暮らしに近いものを選んでください",
    type: "single",
    options: [
      { text: "パートナー・子どもと暮らしている", points: 5, nextQuestion: 4 },
      { text: "パートナーと2人暮らし", points: 0, nextQuestion: 4 },
      { text: "ひとり暮らし", points: 7, nextQuestion: 4 },
      { text: "離婚後パートナーと暮らしている", points: 0, nextQuestion: 4 },
      { text: "離婚後ひとり暮らし", points: -2, nextQuestion: 4 },
      { text: "未婚でひとり暮らし", points: -2, nextQuestion: 4 },
      { text: "未婚で実家暮らし", points: 5, nextQuestion: 4 },
      { text: "決まった住居がない/転々としている", points: 7, nextQuestion: 4 }
    ]
  },
  {
    id: 4,
    text: "現在の仕事や活動スタイルを教えてください",
    type: "single",
    options: [
      { text: "現役で働いている", points: 0, nextQuestion: 5 },
      { text: "働いているが人間関係に悩む", points: 7, nextQuestion: 5 },
      { text: "退職し年金や自由業で生活している", points: 0, nextQuestion: 5 },
      { text: "仕事が楽しく充実している", points: -2, nextQuestion: 5 },
      { text: "体調面の理由で働けていない", points: 7, nextQuestion: 5 }
    ]
  },
  {
    id: 5,
    text: "幼少期の環境を振り返って近いものを選んでください",
    type: "single",
    options: [
      { text: "愛情をしっかり受け取れていた", points: 0, nextQuestion: 6 },
      { text: "厳しさもあったが支えられていた", points: 0, nextQuestion: 6 },
      { text: "厳しさや否定が多くつらかった", points: 7, nextQuestion: 6 },
      { text: "生活面のケアがほとんどなかった", points: 7, nextQuestion: 6 },
      { text: "保護者同士がよく衝突していた", points: 7, nextQuestion: 6 },
      { text: "怒鳴り声や強い言葉が日常的だった", points: 7, nextQuestion: 6 },
      { text: "叩かれるなど身体的な痛みがあった", points: 10, nextQuestion: 6 },
      { text: "一緒に暮らしておらずわからない", points: 5, nextQuestion: 6 },
      { text: "きょうだいと比較されて否定された", points: 7, nextQuestion: 6 },
      { text: "愛情を感じられなかった", points: 10, nextQuestion: 6 },
      { text: "家に安心できる場所がなかった", points: 10, nextQuestion: 6 }
    ]
  },
  {
    id: 6,
    text: "現在のパートナー・家族との関係で近いもの",
    type: "single",
    options: [
      { text: "互いに感謝を伝え合えている", points: -2, nextQuestion: 7 },
      { text: "本音で語り合える関係がある", points: -2, nextQuestion: 7 },
      { text: "同居しているが関係がぎくしゃく", points: 5, nextQuestion: 7 },
      { text: "別居だが関係がぎくしゃく", points: 5, nextQuestion: 7 },
      { text: "パートナーから精神的・身体的な暴力がある", points: 7, nextQuestion: 7 },
      { text: "空気のような存在で特に感情がない", points: 0, nextQuestion: 7 },
      { text: "自分が厳しすぎる振る舞いをしてしまう", points: 10, nextQuestion: 7 },
      { text: "頼れる人がいない", points: 5, nextQuestion: 7 }
    ]
  },
  {
    id: 7,
    text: "これからの生き方や命についてどんな感覚ですか？",
    type: "single",
    options: [
      { text: "楽しみもあり暮らしを味わえている", points: -2, nextQuestion: 8 },
      { text: "深く考えたことはない", points: 0, nextQuestion: 8 },
      { text: "希薄感や虚しさを抱えることが多い", points: 7, nextQuestion: 8 },
      { text: "自分を危険にさらしたことがある", points: 10, nextQuestion: 8 }
    ]
  },
  {
    id: 8,
    text: "今いちばん依存しがちなものを教えてください",
    type: "single",
    options: [
      { text: "特に思い当たらない", points: -2, nextQuestion: 9 },
      { text: "自傷や過度な服薬に頼る", points: 7, nextQuestion: 9 },
      { text: "ギャンブルや投資にのめり込む", points: 7, nextQuestion: 9 },
      { text: "アルコールを多く摂る", points: 7, nextQuestion: 9 },
      { text: "動画/ゲーム/スマホから離れられない", points: 4, nextQuestion: 9 },
      { text: "夜の街など刺激を求めがち", points: 5, nextQuestion: 9 },
      { text: "誰かを責めることでバランスを取る", points: 5, nextQuestion: 9 },
      { text: "恋愛のドキドキに依存している", points: 3, nextQuestion: 9 },
      { text: "その他の対象に強く頼っている", points: 4, nextQuestion: 9 }
    ]
  },
  {
    id: 9,
    text: "専門家による心のケアについて",
    type: "single",
    options: [
      { text: "通院歴はない", points: -2, nextQuestion: 10 },
      { text: "受診したことがある", points: 5, nextQuestion: 10 },
      { text: "診断名を伝えられたことがある", points: 7, nextQuestion: 10 },
      { text: "現在も治療で通院し薬を服用している", points: 7, nextQuestion: 10 },
      { text: "未受診だが自分は不調だと思う", points: 5, nextQuestion: 10 }
    ]
  },
  {
    id: 10,
    text: "いじめやハラスメントの状況を教えてください",
    type: "single",
    options: [
      { text: "今の暮らしで強い言葉や行為を受けている", points: 7, nextQuestion: 11 },
      { text: "家庭よりも地域/コミュニティで孤立しがち", points: 6, nextQuestion: 11 },
      { text: "家族もコミュニティも穏やか", points: -2, nextQuestion: 11 }
    ]
  },
  {
    id: 11,
    text: "自分の意見や感情との付き合い方",
    type: "single",
    options: [
      { text: "周囲を優先し自分を抑えこみがち", points: 7, nextQuestion: 12 },
      { text: "自分の声を大切にできている", points: -2, nextQuestion: 12 },
      { text: "どちらでもなく揺れている", points: 4, nextQuestion: 12 }
    ]
  },
  {
    id: 12,
    text: "今日の自己肯定感を0〜100で入力してください",
    type: "input",
    nextQuestion: "disclaimer"
  }
];

export const questionSets: Record<AssessmentPath, AssessmentQuestion[]> = {
  teen: teenQuestions,
  adult: adultQuestions,
  senior: seniorQuestions
};

export const getQuestionsForPath = (path: AssessmentPath) => questionSets[path];
