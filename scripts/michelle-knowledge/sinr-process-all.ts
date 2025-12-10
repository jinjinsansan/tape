#!/usr/bin/env tsx
/**
 * SINR処理をローカルで実行するスクリプト
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { chunkTextSinr, getChunkStats } from "../../apps/web/src/lib/michelle/chunk-sinr";

// .env.localを読み込む
config({ path: join(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim() || "";

const EMBEDDING_MODEL = "text-embedding-3-small";
const MD_DIR = join(process.cwd(), "apps/web/md/michelle");

const PARENT_SIZE = 800;
const PARENT_OVERLAP = 100;
const CHILD_SIZE = 200;
const CHILD_OVERLAP = 50;

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

function sanitizeUnicode(value: string): string {
  return Array.from(value)
    .filter((char) => {
      const codePoint = char.codePointAt(0);
      return typeof codePoint === "number" && (codePoint < 0xd800 || codePoint > 0xdfff);
    })
    .join("");
}

async function embedText(input: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input
  });
  return response.data[0]?.embedding ?? [];
}

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

async function processFile(filePath: string, fileIndex: number, totalFiles: number) {
  const relativePath = filePath.replace(MD_DIR, "").replace(/\\/g, "/");
  console.log(`\n[${fileIndex}/${totalFiles}]`);
  console.log(`📄 処理中: ${relativePath}`);

  const content = readFileSync(filePath, "utf-8");
  const parents = chunkTextSinr(content, {
    parentSize: PARENT_SIZE,
    parentOverlap: PARENT_OVERLAP,
    childSize: CHILD_SIZE,
    childOverlap: CHILD_OVERLAP
  });

  const stats = getChunkStats(parents);
  console.log(`  📊 統計: 親${stats.parentCount}個、子${stats.childCount}個`);

  // 既存データを削除
  await supabase
    .from("michelle_knowledge_parents")
    .delete()
    .eq("source", relativePath);

  // 親→子を順次挿入
  for (const parent of parents) {
    // 1. 親チャンクを挿入
    const { data: insertedParent, error: parentError } = await supabase
      .from("michelle_knowledge_parents")
      .insert({
        content: sanitizeUnicode(parent.content),
        source: relativePath,
        parent_index: parent.index,
        metadata: {
          child_count: parent.children.length
        }
      })
      .select("id")
      .single();

    if (parentError || !insertedParent) {
      throw parentError || new Error("Failed to insert parent");
    }

    // 2. 子チャンクのembeddingを生成
    const childEmbeddings: number[][] = [];
    for (const child of parent.children) {
      const embedding = await embedText(child.content);
      childEmbeddings.push(embedding);
      await new Promise(resolve => setTimeout(resolve, 100)); // Rate limit対策
    }

    // 3. 子チャンクを挿入
    const childRows = parent.children.map((child, idx) => ({
      parent_id: insertedParent.id,
      content: sanitizeUnicode(child.content),
      embedding: childEmbeddings[idx],
      child_index: child.index,
      metadata: {}
    }));

    const { error: childError } = await supabase
      .from("michelle_knowledge_children")
      .insert(childRows);

    if (childError) {
      throw childError;
    }

    console.log(`  ✅ 親 ${parent.index + 1}/${parents.length} 完了（子${parent.children.length}個）`);
  }

  console.log(`✅ ${relativePath} 完了`);
}

async function main() {
  console.log("🚀 SINR処理開始\n");
  console.log(`📁 ディレクトリ: ${MD_DIR}\n`);

  const files = getMarkdownFiles(MD_DIR);
  console.log(`📚 ${files.length}個のファイルを発見\n`);

  for (let i = 0; i < files.length; i++) {
    try {
      await processFile(files[i]!, i + 1, files.length);
    } catch (error) {
      console.error(`❌ エラー:`, error);
    }
  }

  console.log("\n🎉 全てのSINR処理完了！");
}

main().catch(console.error);
