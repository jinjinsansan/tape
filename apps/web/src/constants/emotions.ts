export type EmotionOption = {
  label: string;
  toneClass: string;
  description: string;
  requiresSelfEsteemScore: boolean;
};

export const EMOTION_OPTIONS: EmotionOption[] = [
  {
    label: "恐怖",
    toneClass: "bg-purple-100 text-purple-800 border-purple-200",
    description: "息苦しさ、震え、冷や汗など身体の反応が強く現れる状態。",
    requiresSelfEsteemScore: false
  },
  {
    label: "悲しみ",
    toneClass: "bg-blue-100 text-blue-800 border-blue-200",
    description: "喪失感や心に穴が空いたような感覚。",
    requiresSelfEsteemScore: false
  },
  {
    label: "怒り",
    toneClass: "bg-red-100 text-red-800 border-red-200",
    description: "体温が上がり、拳を握るようなエネルギー。",
    requiresSelfEsteemScore: false
  },
  {
    label: "悔しい",
    toneClass: "bg-green-100 text-green-800 border-green-200",
    description: "やり返したい、もっと出来たはずというエネルギー。",
    requiresSelfEsteemScore: false
  },
  {
    label: "無価値感",
    toneClass: "bg-gray-100 text-gray-800 border-gray-300",
    description: "存在意義が無いと感じる深い自己否定。",
    requiresSelfEsteemScore: true
  },
  {
    label: "罪悪感",
    toneClass: "bg-orange-100 text-orange-800 border-orange-200",
    description: "申し訳なさや取り返しがつかないと感じる思い。",
    requiresSelfEsteemScore: false
  },
  {
    label: "寂しさ",
    toneClass: "bg-indigo-100 text-indigo-800 border-indigo-200",
    description: "孤独を感じ、誰かに会いたくなる気持ち。",
    requiresSelfEsteemScore: false
  },
  {
    label: "恥ずかしさ",
    toneClass: "bg-pink-100 text-pink-800 border-pink-200",
    description: "隠れたくなる、顔が赤くなる感覚。",
    requiresSelfEsteemScore: false
  },
  {
    label: "嬉しい",
    toneClass: "bg-yellow-100 text-yellow-800 border-yellow-200",
    description: "心が弾み、自然と笑顔になる感覚。",
    requiresSelfEsteemScore: true
  },
  {
    label: "感謝",
    toneClass: "bg-teal-100 text-teal-800 border-teal-200",
    description: "支えられた温かさや恩返ししたい気持ち。",
    requiresSelfEsteemScore: true
  },
  {
    label: "達成感",
    toneClass: "bg-lime-100 text-lime-800 border-lime-200",
    description: "やり切った誇らしさ、努力が報われた感覚。",
    requiresSelfEsteemScore: true
  },
  {
    label: "幸せ",
    toneClass: "bg-amber-100 text-amber-800 border-amber-200",
    description: "満たされて安心している穏やかな状態。",
    requiresSelfEsteemScore: true
  }
];

export const EMOTIONS_REQUIRING_SCORE = new Set(
  EMOTION_OPTIONS.filter((option) => option.requiresSelfEsteemScore).map((option) => option.label)
);

export const findEmotionOption = (label: string) =>
  EMOTION_OPTIONS.find((option) => option.label === label) ?? null;
