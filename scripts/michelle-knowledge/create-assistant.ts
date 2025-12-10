#!/usr/bin/env tsx
/**
 * OpenAI AssistantをAPIで作成するスクリプト
 */

import { config } from "dotenv";
import { join } from "path";
import OpenAI from "openai";

// .env.localを読み込む
config({ path: join(process.cwd(), ".env.local") });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim() || "";

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY環境変数が設定されていません");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function createAssistant() {
  console.log("🚀 OpenAI Assistantを作成しています...\n");

  try {
    const assistant = await openai.beta.assistants.create({
      name: "Michelle",
      description: "Tape式心理学カウンセラー",
      model: "gpt-4o",
      instructions: `あなたはミシェルという名前の心理カウンセラーです。
Tape式心理学に基づいて、ユーザーの心の悩みに寄り添います。

【基本姿勢】
- 共感的な傾聴を心がける
- ユーザー自身が答えを見つけるのをサポートする
- Tape式心理学の知識ベースを活用する
- 専門用語は分かりやすく説明する
- 温かく、優しい口調で話す

【禁止事項】
- 診断や薬の処方はしない
- 危機的状況では専門機関を勧める
- ユーザーを否定しない
- 上から目線にならない

【応答スタイル】
- 簡潔で分かりやすい言葉を使う
- 具体例を交えて説明する
- ユーザーの気持ちに寄り添う
- 質問で対話を深める`,
      tools: [],
      temperature: 0.7,
      top_p: 1.0,
    });

    console.log("✅ Assistant作成完了！\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 Assistant情報");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`ID:          ${assistant.id}`);
    console.log(`Name:        ${assistant.name}`);
    console.log(`Model:       ${assistant.model}`);
    console.log(`Created:     ${new Date(assistant.created_at * 1000).toISOString()}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
    console.log("📝 次のステップ:");
    console.log("1. 上記のAssistant IDをコピーしてください");
    console.log("2. Vercel環境変数 MICHELLE_ASSISTANT_ID を更新してください");
    console.log(`   値: ${assistant.id}`);
    console.log("3. .env.local も更新してください");
    console.log(`   MICHELLE_ASSISTANT_ID="${assistant.id}"`);
    console.log("4. Vercelで再デプロイしてください\n");

    return assistant;
  } catch (error) {
    console.error("❌ Assistant作成エラー:", error);
    if (error instanceof Error) {
      console.error("エラーメッセージ:", error.message);
    }
    process.exit(1);
  }
}

createAssistant();
