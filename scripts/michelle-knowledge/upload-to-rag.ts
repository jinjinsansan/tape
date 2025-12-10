#!/usr/bin/env tsx
/**
 * ミシェル知識ベースをRAGデータベースにアップロードするスクリプト
 * 
 * 使い方:
 * npm run upload-michelle-knowledge
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { chunkText } from "./chunk";

// .env.localを読み込む
config({ path: join(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim() || "";

const EMBEDDING_MODEL = "text-embedding-3-small";
const MD_DIR = join(process.cwd(), "apps/web/md/michelle");

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

// マークダウンファイルを再帰的に取得
function getMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getMarkdownFiles(fullPath));
    } else if (item.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

// Embedding生成
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.trim()
  });
  return response.data[0]?.embedding ?? [];
}

// ファイルをRAGデータベースに投入
async function uploadFile(filePath: string) {
  const content = readFileSync(filePath, "utf-8");
  const relativePath = filePath.replace(MD_DIR, "").replace(/^\//, "");
  
  console.log(`📄 処理中: ${relativePath}`);

  // ファイル全体をチャンク分割
  const chunks = chunkText(content, { chunkSize: 1000, overlap: 200 });

  for (const chunk of chunks) {
    try {
      // Embedding生成
      const embedding = await generateEmbedding(chunk.content);

      // データベースに保存
      const { error } = await supabase.from("michelle_knowledge").insert({
        content: chunk.content,
        embedding,
        metadata: {
          source: relativePath,
          chunk_index: chunk.index,
          total_chunks: chunks.length
        }
      });

      if (error) {
        console.error(`  ❌ チャンク ${chunk.index} エラー:`, error.message);
      } else {
        console.log(`  ✅ チャンク ${chunk.index}/${chunks.length - 1} 完了`);
      }

      // Rate limit対策
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`  ❌ チャンク ${chunk.index} エラー:`, error);
    }
  }

  console.log(`✅ ${relativePath} 完了\n`);
}

// メイン処理
async function main() {
  console.log("🚀 ミシェル知識ベースのアップロード開始\n");
  console.log(`📁 ディレクトリ: ${MD_DIR}\n`);

  // 既存データをクリア（オプション）
  const clearExisting = process.argv.includes("--clear");
  if (clearExisting) {
    console.log("🗑️  既存データをクリアしています...");
    const { error } = await supabase.from("michelle_knowledge").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      console.error("❌ クリアエラー:", error);
    } else {
      console.log("✅ 既存データクリア完了\n");
    }
  }

  // マークダウンファイルを取得
  const files = getMarkdownFiles(MD_DIR);
  console.log(`📚 ${files.length}個のファイルを発見\n`);

  // 各ファイルをアップロード
  for (let i = 0; i < files.length; i++) {
    console.log(`[${i + 1}/${files.length}]`);
    await uploadFile(files[i]);
  }

  console.log("🎉 全てのアップロード完了！");
}

main().catch((error) => {
  console.error("❌ エラー:", error);
  process.exit(1);
});
