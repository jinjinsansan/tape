/** X投稿文ジェネレーター — OpenAIで投稿文を生成 */

import OpenAI from "openai";
import type { QuoteMaster } from "./quotes-master";

const CATEGORY_LABELS: Record<string, string> = {
  worthless: "無価値観",
  lonely: "寂しさ",
  fear: "恐怖",
  anger: "怒り",
  sadness: "悲しみ",
  guilt: "罪悪感",
};

export interface GeneratedPost {
  postBody: string;
  hashtags: string[];
  fullText: string;
}

export async function generateXPost(
  quote: QuoteMaster,
): Promise<GeneratedPost> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const openai = new OpenAI({ apiKey });

  const sourceText = quote.character
    ? `${quote.source} / ${quote.character}`
    : quote.source;

  const prompt = `あなたはX（旧Twitter）の心理系アカウントの投稿ライターです。
以下の名言をベースに、心に刺さるX投稿文を1つ作成してください。

【名言】
「${quote.text}」
— ${sourceText}

【この名言のテーマ】
${CATEGORY_LABELS[quote.category]}を感じている人に刺さる名言です。

【投稿文のルール】
1. 冒頭に名言を「」付きで引用し、作品名・キャラクター名を記載
2. 改行を入れてから「この言葉が刺さった人へ」と続ける
3. 心理的な解説を3〜4行（専門用語は使わない、わかりやすく）
4. 「あなたの心の奥に〜という思い込みがあるかもしれません」という表現を必ず入れる
5. 最後に短い問いかけで締める（例：「心当たり、ありますか？」）
6. 本文は120〜160文字（ハッシュタグ含めず）
7. 「テープ式心理学」「ミシェル心理学」などの固有名詞は絶対に出さない
8. 柔らかく、押しつけがましくないトーンで

【ハッシュタグ】
以下から4〜5個選んでください：
#心理学 #名言 #アニメ名言 #生きづらさ #自己肯定感 #心が楽になる #HSP #メンタルヘルス #人間関係 #自己分析 #気づき #人生 #幸せ #毎日投稿

【出力形式】JSONのみで返してください（説明文不要）：
{
  "postBody": "投稿本文（ハッシュタグなし）",
  "hashtags": ["#心理学", "#名言", ...]
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.8,
    max_tokens: 512,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content) as {
    postBody: string;
    hashtags: string[];
  };

  const fullText = `${parsed.postBody}\n\n${parsed.hashtags.join(" ")}`;

  return {
    postBody: parsed.postBody,
    hashtags: parsed.hashtags,
    fullText,
  };
}
