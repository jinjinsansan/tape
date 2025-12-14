#!/usr/bin/env tsx
/**
 * ミシェル知識ベースをRAGデータベースにアップロードするスクリプト
 * 
 * 使い方:
 * npm run upload-michelle-knowledge
 */

import { readFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// .env.localを読み込む
config({ path: join(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim() || "";

const EMBEDDING_MODEL = "text-embedding-3-small";
const KNOWLEDGE_JSON = join(process.cwd(), "apps/web/src/server/data/michelle-knowledge.json");

type KnowledgeChunk = {
  id: string;
  title: string;
  sourceTitle?: string;
  relativePath: string;
  summary: string;
  keyPoints: string[];
  content: string;
  chunkIndex?: number;
  chunkCount?: number;
  sectionHeading?: string | null;
};

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

function loadKnowledgeChunks(): KnowledgeChunk[] {
  try {
    const raw = readFileSync(KNOWLEDGE_JSON, "utf-8");
    const data = JSON.parse(raw) as KnowledgeChunk[];
    return data;
  } catch (error) {
    console.error("❌ 知識インデックスの読み込みに失敗しました", error);
    process.exit(1);
  }
}

// Embedding生成
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.trim()
  });
  return response.data[0]?.embedding ?? [];
}

async function uploadChunk(chunk: KnowledgeChunk, index: number, total: number) {
  console.log(`[${index}/${total}] ${chunk.relativePath} #${(chunk.chunkIndex ?? 0) + 1}`);
  try {
    const embedding = await generateEmbedding(chunk.content);
    const metadata = {
      source: chunk.relativePath,
      chunk_id: chunk.id,
      chunk_index: chunk.chunkIndex ?? null,
      chunk_count: chunk.chunkCount ?? null,
      section_heading: chunk.sectionHeading ?? null,
      source_title: chunk.sourceTitle ?? chunk.title
    };

    const { error } = await supabase.from("michelle_knowledge").insert({
      content: chunk.content,
      embedding,
      metadata
    });

    if (error) {
      console.error(`  ❌ 追加に失敗: ${error.message}`);
    } else {
      console.log(`  ✅ 登録完了`);
    }
  } catch (error) {
    console.error("  ❌ Embedding/登録エラー", error);
  }

  await new Promise((resolve) => setTimeout(resolve, 100));
}

// メイン処理
async function main() {
  console.log("🚀 ミシェル知識ベースのアップロード開始\n");
  console.log(`📄 インデックス: ${KNOWLEDGE_JSON}\n`);
  const knowledgeChunks = loadKnowledgeChunks();
  console.log(`📚 ${knowledgeChunks.length}チャンクを発見\n`);
  const clearExisting = process.argv.includes("--clear");

  // 既存データをクリア（オプション）
  if (clearExisting) {
    console.log("🗑️  既存データをクリアしています...");
    const { error } = await supabase.from("michelle_knowledge").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      console.error("❌ クリアエラー:", error);
    } else {
      console.log("✅ 既存データクリア完了\n");
    }
  }

  let processed = 0;
  for (const chunk of knowledgeChunks) {
    processed += 1;
    await uploadChunk(chunk, processed, knowledgeChunks.length);
  }

  console.log("🎉 全てのアップロード完了！");
}

main().catch((error) => {
  console.error("❌ エラー:", error);
  process.exit(1);
});
