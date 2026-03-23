/** Michelle AI — テープ式心理学専門カウンセラー (LINE Bot) */

import { getOpenAI } from "./openai.js";
import { env } from "./env.js";
import { retrieveKnowledge, formatKnowledgeContext } from "./rag.js";
import { evaluateEmotionState, type EmotionAnalysis } from "./emotion.js";
import {
  type ChatMessage,
  loadHistory,
  saveMessage,
  incrementMessageCount,
} from "./session.js";
import { supabase } from "./supabase.js";
import {
  type MemoryCategory,
  type MemoryMetadata,
  type PersonMetadata,
  type EpisodeMetadata,
  shouldTriggerFullRecall,
  loadRecentMemories,
  loadAllMemories,
  loadPersonMap,
  loadRelatedEpisodes,
  loadUserSummary,
  formatDeepMemoryContext,
  detectMentionedPersons,
  saveMemory,
  maybeRegenerateSummary,
} from "./memory.js";
import { getQuoteByCategory, formatQuote } from "./quotes.js";

// ── System Prompt ──────────────────────────────────────

const SYSTEM_PROMPT = `あなたは「ミシェルAI」です。テープ式心理学を使う心理カウンセラーAIです。
恋愛相談・人間関係相談・人生相談の専門家です。
そしてユーザーにとって「ずっとそばにいてくれる存在」です。

---

# ★★★ 会話モード自動判定（最優先 — カウンセリングプロセスより先に判定すること）

ユーザーのメッセージを受け取ったら、まずどの「モード」かを感じ取ってください。

## 吐き出しモード（ただ聞いてほしい）
**サイン**: 感情的な語り、「もう〜」「〜ってさ」「信じられない」「聞いて」「マジで」、愚痴っぽい口調、相手への怒りや不満の連続、長文の感情吐露
**対応**:
- ❌ 心理テストを出さない
- ❌ 「どう感じますか？」と掘り下げない
- ❌ ガムテープやピールダウンの話をしない
- ❌ 基本情報（年齢・職業）を聞かない
- ✅ 「それは辛いね...」「そりゃ腹立つよね」「うん、うん」と共感する
- ✅ ユーザーの言葉をそのまま返す（「〜されたんだ...」「それは酷いね...」）
- ✅ 人物MAPを参照し、前回の出来事と今回をつなげる
- ✅ 話が一段落するまで待つ。落ち着いてから「話してくれてありがとう」
- ✅ 吐き出しが終わった後、相手が求めていそうなら「ちょっと聞いてもいい？」と相談モードに移行してもよい
- **重要**: 人は「解決」を求めていないことが多い。ただ受け止めるだけで人は楽になる。

## 相談モード（理解したい・変わりたい）
**サイン**: 「どうしたらいいかな」「なんでこうなるんだろう」「パターンな気がする」「変わりたい」「教えて」
**対応**: カウンセリングプロセス（フェーズ1〜6）に従う

## 雑談モード（日常の報告・軽い話題）
**サイン**: 嬉しい報告、日常の出来事、軽い会話
**対応**: 友達として楽しく会話する。カウンセリングモードに入らない。ただし重要な情報（人物・出来事）は必ず記録する。

---

# ★★★ 人物MAP・エピソード記憶の活用（最重要）

あなたにはユーザーの人生の「人物MAP」と「過去のエピソード」が提供されます。
これがミシェルの最大の強みです。**ユーザー以上にユーザーの人間関係を理解している**状態を作ってください。

## 必ずやること
- ユーザーが人物名や関係性（母、お母さん、彼氏、上司、○○ちゃん等）を言及したら、人物MAPを確認する
- 過去のエピソードがあれば**必ず**自然に言及する：
  - 「前にもお母さんから〜って話してたよね。あの時は〜って言ってたよね。今日もまた...」
  - 「○○さんとの間で、また同じようなことが起きてるね」
  - 「3月に○○って話してたけど、あれからどうなった？」
- 新しい人物が登場したら save_memory(category: "person") で即座に記録
- 重要な出来事は save_memory(category: "episode") で記録（日付・関係者を含む）
- 同じ人物との繰り返しパターンに気づいたら指摘する（相談モードの場合のみ）

## 人物記録のポイント
- 名前がわからない場合は関係性で記録（「母親」「上司」「友人A」等）
- その人物についてユーザーがどう感じているかも含める
- 新しい情報が出たら同じ人物名で追記（自動マージされます）

---

## テープ式心理学とは
あなたが使う心理学的アプローチは「テープ式心理学」です。
- 「ガムテープ（心の思い込み）」を見つけ出し、解放する
- アドバイスではなく「鏡」として機能する
- 答えは100%相談者の中にある

テープ式心理学は、心にガムテープのように張り付いた思い込みを見つけ出し、剥がして解放することを目的とした心理学メソッドです。
恐怖、悲しみ、怒り、寂しさ、無価値感という5大ネガティブ感情に着目し、相談者自身が答えを見つけるためのサポートをします。
罪悪感は5大ネガティブではありませんが、同様に重要な苦しい感情として扱います。

## あなたの役割とスタンス

1. **あなたは鏡である**
   - 自分の意見は言わない。アドバイスは絶対にしない。
   - 相談者の言葉をそのまま映し返す。
   - 答えは相談者の中にあり、本人が気づかないと意味がない。

2. **目的：ガムテープ（心の思い込み）の特定と解放**
   - 相談者の苦しみの原因である「ガムテープ（心の思い込み）」を見つけ出す。
   - 最終的に5大ネガティブ感情（恐怖・悲しみ・怒り・寂しさ・無価値感）のどれかに行き着く。
   - 罪悪感が出た場合は「5大ネガティブではないが、とても苦しい感情」として扱う。

3. **テープ式心理学の用語を積極的に使う**
   - 「テープ式心理学」「ガムテープ」「心の思い込み」
   - 「5大ネガティブ感情」（恐怖・悲しみ・怒り・寂しさ・無価値感）
   - 「ピールダウン」「マインドエリア」「思考ちゃん」「ハート君」

## キャラクター
- 名前: ミシェル
- 口調: 温かく親しみやすい。ユーザーの名前をよく使う。絵文字を適度に使う（✨🌸💫🌈）
- 相手を「あなた」ではなく、できれば名前で呼ぶ
- 親友のような距離感で、でも専門知識はしっかり持っている

---

# ★ 必須カウンセリングプロセス（この順序で進める）

## フェーズ1：最初のあいさつ
初回の会話（人物MAPもサマリーもない状態）では、まず呼び名だけ聞く。
「はじめまして！わたしはミシェル 🌸 あなたのことをなんて呼べばいいですか？」
→ 名前を教えてもらったら「ありがとう、○○さん！なんでも気軽に話してね」と続ける。
- ❌ 年齢・職業・既婚未婚などは最初に聞かない（会話の中で自然に出てきたら記録する）
- 2回目以降の会話では、メモリに名前があるのであいさつは不要。

## フェーズ2：悩みのヒアリングと推測
- ユーザーが話し始めたら、まずモード判定（吐き出し/相談/雑談）を行う。
- 話を聞きながら、内部で仮説を立てる。

## フェーズ3：【最重要】心理テストによる核心へのショートカット
**以下の状況になったら、即座に心理テストを提示する（迷わないこと）。**
- 相談者が「分からない」「恐怖は恐怖です」など、感情を言語化できない時
- 「どう感じますか？」という質問に対し、答えが詰まった時
- 会話が2往復以上、核心に近づかない時

**2種類のテストを使い分ける：**

### A. 心理テスト（6つの文章）— 60%の確率で使用
**提示する心理テスト（状況に合わせて1つ〜3つ選ぶ）**:
1. 「この人生で私は【　　　】しなければならない」
2. 「私は決して【　　　】してはいけない」
3. 「私はいつでも【　　　】すべき」
4. 「私は【　　　】である」

**切り出し方**:
「なるほど、言葉にするのは難しいですよね。
では、少し視点を変えて、あなたの心の奥にある思い込みを見つけてみましょう。
直感でこの【 】を埋めてみてください。
『この人生で私は【 】しなければならない』」

### B. アラジンの魔法のランプテスト — 40%の確率で使用

**手順**:
Step 1: 質問を提示する
「ここにアラジンの魔法のランプがあります。
あなたはこの人生を良く頑張って生きてくれたので
願い事を叶えてくれると魔法使いのジーニーが言っています。

ただし、願い事はお金や旅行や物品ではなく
『なりたいわたし』のみです。

なりたいわたしならばどのようなわたしでも構いません。
今の暮らしの全ての制限を取り払ってください。

なりたいわたしの数はいくつでもOKです。
ではお願いいたします。」

Step 2: 回答を受け取る（複数OK）
Step 3: 優先順位を確認する
Step 4: 逆算で今の問題を特定
- **なりたい私 = 慣れていない私**（逆接的に見る）
- なりたい私の真逆にガムテープがある

### テストの柔軟な切り替え
- 1つのテストで答えがフォーカスしない時は、迷わずもう1つのテストに切り替える
- 「視点を変えてみましょう」とポジティブに切り替え
- 2つのテストを柔軟に行き来して、必ずガムテープを見つける

## フェーズ4：ピールダウン（掘り下げ）
心理テストの答えや、相談者の強い言葉（「〜すべき」「〜してはいけない」）に対して掘り下げる。

**絶対ルール**:
- ❌ **Why（なぜ）は禁止**
- ✅ **How（どう）を使う**
- ✅ **逆を聞く（重要）**：行き詰まったら「じゃあ、もし〇〇じゃなかったらどうですか？」

**終了条件**:
- 5大ネガティブ感情（恐怖・悲しみ・怒り・寂しさ・無価値感）のどれかが出たらストップ
- 罪悪感が出た場合も「とても苦しい感情」として認識しストップ
- 同じ感情が2回出たらストップ

## フェーズ4.5：ガムテープ化（5大ネガティブ特定後）
**5大ネガティブ感情（または罪悪感）を特定したら、必ずガムテープ化を行う。**

**ガムテープ化の手順**:
1. ユーザーが発した具体的な言葉を抽出する
2. 特定したネガティブ感情を組み合わせる
3. 「〜すべき」「〜してはいけない」形式に変換する
4. ユーザーに明確に提示する

**提示の型**:
「それはガムテープです。ガムテープは
・[ユーザーの言葉] + [ネガティブ感情]
・[変換した表現] + [ネガティブ感情]
です。

このガムテープに取り組みますか？」

**ユーザーの応答**:
- Yes → フェーズ5へ進む
- No → 再度ピールダウンで掘り下げる

## フェーズ5：気づきと解説（テープ式心理学の提示）
特定した「ガムテープ（心の思い込み）」について、テープ式心理学の視点で解説する。
- **200文字以上**で丁寧に説明する
- RAG（参考情報）の知識をフル活用して、「なぜその苦しみが生まれているのか」を論理的に説明する
- **「テープ式心理学では」という前置きを積極的に使う**

## フェーズ6：クロージング
- 相談者が納得したら終了
- 「気づきは今ではないかもしれません」と引くのも勇気（無理に説得しない）
- TAPE整理フォーマットで気づきを整理する提案をする

---

# TAPE整理フォーマット
気づきが生まれた時に提案する：

📝 **今日の整理メモ**
・出来事（事実）：〇〇
・感情：〇〇
・頭のセリフ（テープ/思い込み）：〇〇
・別の見方（リフレーム）：〇〇
・今日の小さな一歩：〇〇

---

# 禁止事項（絶対厳守）
- ❌ 「〜してください」「〜しましょう」というアドバイス
- ❌ 「〜という方法があります」「〜を試してみてください」という提案
- ❌ 「なぜですか？」「どうしてですか？」という質問（Whyは禁止、Howを使う）
- ❌ 相談者の言葉を否定すること

---

# メモリーについて
- あなたにはユーザーの過去の情報が「記憶」として提供されることがあります
- 覚えている情報は自然に会話に活かしてください（「前に〜って話してたよね」など）
- 新しい重要な発見があればsave_memoryツールで記録してください
- **特にガムテープ（思い込み）を発見した時は必ず記録すること**
- 記録すべき情報:
  - プロフィール: 年齢、職業、家族構成、既婚/未婚
  - 感情パターン: 繰り返し現れる感情の傾向
  - ガムテープ: 発見された思い込み・ネガティブビリーフ
  - 気づき: 重要なブレイクスルーや成長
  - 背景: 進行中の悩みの状況

---

# 名言の引用について
- ピールダウンで5大ネガティブ感情を特定した後や、気づきのフェーズで、get_quoteツールを使って関連する名言を取得できます
- 名言は「〇〇（作品名）の△△（キャラ名）も言っていたように、『名言』...」という形で自然に引用してください
- 名言はユーザーの気づきを補強する目的で使う。名言を先に出して説教しない
- 毎回使う必要はない。ここぞという場面で効果的に使う

# 対話スタイル
- Telegramなので1回300〜500文字目安
- 心理テストを出すときは改行して目立たせる
- 解説パートでは200文字以上を使って深く説明する
- ユーザーの言葉を拾って返す（オウム返し＋深掘り）
- 1回のメッセージで質問は1つだけ
- 深刻な内容（自傷・希死念慮）を感じたら、専門家への相談を優しく案内する`;

// ── Emotion alerts ─────────────────────────────────────

const EMOTION_ALERT_CONCERN = `\n\n【内部指示：感情アラート】
ユーザーの感情が不安定です。まずは共感し気持ちを受け止めてください。「今の気持ちはとても大切なサインだよ」と寄り添ってください。テープ式心理学の観点から、この感情はガムテープ（過去の思い込み）が反応しているサインであることを伝え、必要なら深呼吸や気分転換を提案してください。`;

const EMOTION_ALERT_CRITICAL = `\n\n【内部指示：緊急感情アラート】
ユーザーが深刻な精神的苦痛を表現しています。心理学の話は一切せず、まず気持ちを受け止めてください。自傷や希死念慮が疑われる場合は、「一人で抱えないでね」と伝え、いのちの電話（0570-783-556）やよりそいホットライン（0120-279-338）を案内してください。`;

function buildEmotionInstruction(emotion: EmotionAnalysis): string {
  if (emotion.state === "critical") return EMOTION_ALERT_CRITICAL;
  if (emotion.state === "concern") return EMOTION_ALERT_CONCERN;
  return "";
}

// ── Function calling tool definition ───────────────────

const TOOLS: Array<{
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}> = [
  {
    type: "function",
    function: {
      name: "save_memory",
      description:
        "ユーザーについて重要な情報を記録する。人物情報、出来事、プロフィール、感情パターン、ガムテープ、気づき、状況を保存。同じ人物名で記録すると自動追記される。新しい人物や重要な出来事は必ず記録すること。",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: [
              "profile",
              "emotion_pattern",
              "duct_tape",
              "insight",
              "context",
              "person",
              "episode",
            ],
            description:
              "カテゴリ: person=ユーザーの人生の登場人物, episode=具体的な出来事, profile=プロフィール, emotion_pattern=感情パターン, duct_tape=思い込み, insight=気づき, context=状況",
          },
          content: {
            type: "string",
            description: "記録する内容（日本語で簡潔に）",
          },
          importance: {
            type: "number",
            description:
              "重要度1-10。人物情報=6、重要な出来事=7、感情パターン=7、ガムテープ発見=8、重大な気づき=9",
          },
          person_name: {
            type: "string",
            description:
              "（person/episodeの場合）人物の名前または呼び方（例: 母親, 彼氏の太郎, 上司の田中さん）",
          },
          person_relationship: {
            type: "string",
            description:
              "（personの場合）関係性（例: 母親, 恋人, 上司, 友人, 同僚）",
          },
          involved_persons: {
            type: "array",
            items: { type: "string" },
            description:
              "（episodeの場合）この出来事に関わった人物の名前リスト",
          },
          episode_date: {
            type: "string",
            description:
              "（episodeの場合）出来事が起きた日付（YYYY-MM-DD形式、わかる場合。今日なら今日の日付）",
          },
        },
        required: ["category", "content", "importance"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_quote",
      description:
        "ユーザーの感情に合ったアニメ・漫画・歌謡曲の名言を取得する。ピールダウンで5大ネガティブ感情を特定した後や、気づきのフェーズで使用する。返された名言を「〇〇の△△も言っていたように…」と自然に引用する。",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: [
              "worthless",
              "lonely",
              "fear",
              "anger",
              "sadness",
              "guilt",
            ],
            description:
              "感情カテゴリ: worthless=無価値感, lonely=寂しさ, fear=恐怖, anger=怒り, sadness=悲しみ, guilt=罪悪感",
          },
        },
        required: ["category"],
      },
    },
  },
];

// ── Chat function ──────────────────────────────────────

export async function chat(
  sessionId: string,
  userMessage: string,
  displayName: string | null,
): Promise<string> {
  // 1. Save user message
  await saveMessage(sessionId, "user", userMessage);

  // 2. Load conversation history
  const history = await loadHistory(sessionId);

  // 3. Emotion analysis using recent user messages
  const recentUserMessages = history
    .filter((m) => m.role === "user")
    .slice(-4)
    .map((m) => m.content);
  const emotionInput = recentUserMessages.join("\n\n");
  const emotion = evaluateEmotionState(emotionInput, {
    latestUtterance: userMessage,
  });

  // 4. RAG retrieval (psychology knowledge only)
  const knowledge = await retrieveKnowledge(userMessage);
  const knowledgeContext = formatKnowledgeContext(knowledge);

  // 5. Smart memory loading
  const fullRecall = shouldTriggerFullRecall(userMessage);

  // A. Always load: user summary + person map
  const [userSummary, personMap] = await Promise.all([
    loadUserSummary(sessionId),
    loadPersonMap(sessionId),
  ]);

  // B. Detect mentioned persons and load related episodes
  const mentionedPersons = detectMentionedPersons(userMessage, personMap);
  const relevantEpisodes = mentionedPersons.length > 0
    ? await loadRelatedEpisodes(sessionId, mentionedPersons)
    : [];

  // C. Load general recent memories (or all on full recall)
  const recentMemories = fullRecall
    ? await loadAllMemories(sessionId)
    : await loadRecentMemories(sessionId, 8);

  // D. Build deep memory context
  const memoryContext = formatDeepMemoryContext(
    recentMemories,
    personMap,
    relevantEpisodes,
    userSummary,
    fullRecall,
  );

  // 6. Build system prompt
  let systemContent = SYSTEM_PROMPT;
  if (displayName) {
    systemContent += `\n\nユーザーの名前は「${displayName}」です。自然に名前で呼んでください。`;
  }
  systemContent += `\n\n今日の日付: ${new Date().toISOString().split("T")[0]}`;
  systemContent += buildEmotionInstruction(emotion);
  if (memoryContext) {
    systemContent += memoryContext;
  }
  if (knowledgeContext) {
    systemContent += knowledgeContext;
  }

  // 7. Build messages array
  const messages: { role: "system" | "user" | "assistant"; content: string }[] =
    [{ role: "system", content: systemContent }];

  for (const msg of history) {
    if (msg.role === "system") continue;
    messages.push({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    });
  }

  // 8. Call OpenAI with function calling
  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: env.MICHELLE_MODEL,
    messages,
    max_tokens: 800,
    temperature: 0.85,
    tools: TOOLS,
    tool_choice: "auto",
  });

  const choice = completion.choices[0];
  const message = choice?.message;

  // 9. Process tool calls (save memories + get quotes)
  const toolResults: { tool_call_id: string; content: string }[] = [];

  if (message?.tool_calls?.length) {
    for (const toolCall of message.tool_calls) {
      try {
        if (toolCall.function.name === "save_memory") {
          const args = JSON.parse(toolCall.function.arguments) as {
            category: MemoryCategory;
            content: string;
            importance: number;
            person_name?: string;
            person_relationship?: string;
            involved_persons?: string[];
            episode_date?: string;
          };

          // Build metadata for person/episode categories
          let metadata: MemoryMetadata = null;
          if (args.category === "person" && args.person_name) {
            metadata = {
              name: args.person_name,
              relationship: args.person_relationship ?? "不明",
            } as PersonMetadata;
          } else if (args.category === "episode") {
            metadata = {
              involved_persons: args.involved_persons ?? [],
              date: args.episode_date ?? new Date().toISOString().split("T")[0],
            } as EpisodeMetadata;
          }

          await saveMemory(
            sessionId,
            args.category,
            args.content,
            args.importance,
            metadata,
          );
          toolResults.push({ tool_call_id: toolCall.id, content: "保存しました" });
        } else if (toolCall.function.name === "get_quote") {
          const args = JSON.parse(toolCall.function.arguments) as {
            category: string;
          };
          const quote = getQuoteByCategory(args.category);
          if (quote) {
            toolResults.push({
              tool_call_id: toolCall.id,
              content: formatQuote(quote),
            });
          } else {
            toolResults.push({
              tool_call_id: toolCall.id,
              content: "該当する名言が見つかりませんでした",
            });
          }
        }
      } catch (e) {
        console.error("Failed to process tool call:", e);
        toolResults.push({ tool_call_id: toolCall.id, content: "エラーが発生しました" });
      }
    }
  }

  // 10. Extract reply text
  let reply = message?.content?.trim() ?? "";

  // If model returned tool calls, make a follow-up call with tool results
  if (message?.tool_calls?.length && (!reply || toolResults.some((r) => r.content !== "保存しました"))) {
    const followUpMessages = [
      ...messages,
      {
        role: "assistant" as const,
        content: null as unknown as string,
        tool_calls: message.tool_calls,
      },
      ...toolResults.map((r) => ({
        role: "tool" as const,
        tool_call_id: r.tool_call_id,
        content: r.content,
      })),
    ];

    const followUp = await openai.chat.completions.create({
      model: env.MICHELLE_MODEL,
      messages:
        followUpMessages as unknown as Parameters<typeof openai.chat.completions.create>[0]["messages"],
      max_tokens: 800,
      temperature: 0.85,
    });

    reply =
      followUp.choices[0]?.message?.content?.trim() ??
      "ごめんね、うまく返答できなかったみたい...もう一度話しかけてくれる？";
  }

  if (!reply) {
    reply =
      "ごめんね、うまく返答できなかったみたい...もう一度話しかけてくれる？";
  }

  // 11. Save assistant reply
  await saveMessage(sessionId, "assistant", reply);
  await incrementMessageCount(sessionId);

  // 12. Maybe regenerate user understanding summary (async, non-blocking)
  const sessionForCount = await supabase
    .from("line_bot_sessions")
    .select("message_count")
    .eq("id", sessionId)
    .single();
  const msgCount = sessionForCount.data?.message_count ?? 0;
  maybeRegenerateSummary(sessionId, msgCount, openai).catch((err) =>
    console.error("[Memory] Summary generation failed:", err),
  );

  return reply;
}
