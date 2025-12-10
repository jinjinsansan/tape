import { getSupabaseAdminClient } from "@/server/supabase";
import { michelleServerEnv } from "@/lib/michelle/env.server";
import { getMichelleOpenAIClient } from "@/lib/michelle/openai";
import type { Json } from "@tape/supabase";

const EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_THRESHOLD = 0.65;
const FALLBACK_THRESHOLDS = [0.58, 0.5, 0.45, 0.35];

export type KnowledgeMatch = {
  id: string;
  content: string;
  metadata: Json | null;
  similarity: number;
};

type SinrMatch = {
  parent_id: string;
  parent_content: string;
  parent_metadata: Json | null;
  parent_source: string;
  child_similarity: number;
};

/**
 * テキストをembeddingに変換
 * エラーハンドリング付き
 */
export const embedText = async (text: string): Promise<number[]> => {
  const normalized = text.trim();
  if (!normalized) {
    console.log("[RAG] Empty text, skipping embedding");
    return [];
  }

  try {
    console.log(`[RAG] Generating embedding for: "${normalized.slice(0, 50)}..."`);
    const client = getMichelleOpenAIClient();
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: normalized
    });

    const embedding = response.data[0]?.embedding ?? [];
    console.log(`[RAG] Embedding generated: ${embedding.length} dimensions`);
    return embedding;
  } catch (error) {
    console.error("[RAG] Embedding generation failed:", error);
    return [];
  }
};

type RetrieveOptions = {
  matchCount?: number;
  similarityThreshold?: number;
};

/**
 * 既存RAG検索（1000文字チャンク）
 * 複数の閾値でフォールバック
 */
const retrieveOriginalMatches = async (
  embedding: number[],
  options: RetrieveOptions
): Promise<KnowledgeMatch[]> => {
  const supabase = getSupabaseAdminClient();

  const thresholds = [options.similarityThreshold ?? DEFAULT_THRESHOLD, ...FALLBACK_THRESHOLDS]
    .filter((value, index, arr) => value > 0 && arr.indexOf(value) === index)
    .sort((a, b) => b - a);

  console.log(`[RAG Original] Will try ${thresholds.length} thresholds: ${thresholds.join(", ")}`);

  for (const threshold of thresholds) {
    console.log(`[RAG Original] Attempting with threshold: ${threshold}`);

    const { data, error } = await supabase.rpc("match_michelle_knowledge", {
      query_embedding: embedding,
      match_count: options.matchCount ?? 8,
      similarity_threshold: threshold
    } as never);

    if (error) {
      console.error("[RAG Original] RPC error:", error);
      continue;
    }

    const matches = (data ?? []) as KnowledgeMatch[];
    console.log(`[RAG Original] RPC returned ${matches.length} matches at threshold ${threshold}`);

    if (matches.length) {
      return matches;
    }
  }

  console.log("[RAG Original] No matches found after all threshold attempts");
  return [];
};

/**
 * SINR検索：子チャンクで検索→親チャンクを返す
 * 複数の閾値でフォールバック
 */
const retrieveSinrMatches = async (
  embedding: number[],
  options: RetrieveOptions
): Promise<KnowledgeMatch[]> => {
  const supabase = getSupabaseAdminClient();

  const thresholds = [options.similarityThreshold ?? DEFAULT_THRESHOLD, ...FALLBACK_THRESHOLDS]
    .filter((value, index, arr) => value > 0 && arr.indexOf(value) === index)
    .sort((a, b) => b - a);

  console.log(`[RAG SINR] Will try ${thresholds.length} thresholds: ${thresholds.join(", ")}`);

  for (const threshold of thresholds) {
    console.log(`[RAG SINR] Attempting with threshold: ${threshold}`);

    const { data, error } = await supabase.rpc("match_michelle_knowledge_sinr", {
      query_embedding: embedding,
      match_count: options.matchCount ?? 8,
      similarity_threshold: threshold
    } as never);

    if (error) {
      console.error("[RAG SINR] RPC error:", error);
      continue;
    }

    const sinrMatches = (data ?? []) as SinrMatch[];
    console.log(`[RAG SINR] RPC returned ${sinrMatches.length} matches at threshold ${threshold}`);

    if (sinrMatches.length) {
      // SinrMatchをKnowledgeMatchに変換
      const knowledgeMatches = sinrMatches.map((match) => ({
        id: match.parent_id,
        content: match.parent_content,
        metadata: match.parent_metadata,
        similarity: match.child_similarity
      }));
      console.log(`[RAG SINR] Converted ${knowledgeMatches.length} SINR matches to KnowledgeMatch format`);
      return knowledgeMatches;
    }
  }

  console.log("[RAG SINR] No matches found after all threshold attempts");
  return [];
};

/**
 * RAG検索のメイン関数
 * SINR/通常RAGを環境変数で切り替え、フォールバック機能付き
 */
export const retrieveKnowledgeMatches = async (
  text: string,
  options: RetrieveOptions = {}
): Promise<KnowledgeMatch[]> => {
  console.log(`[RAG] Starting knowledge retrieval for query: "${text.slice(0, 50)}..."`);

  const embedding = await embedText(text);
  if (!embedding.length) {
    console.log("[RAG] No embedding generated, returning empty matches");
    return [];
  }

  console.log(`[RAG] Embedding ready (${embedding.length} dims), starting search`);
  console.log(`[RAG] Mode: ${michelleServerEnv.useSinrRag ? "SINR" : "Original"}`);
  console.log(`[RAG] Options:`, {
    matchCount: options.matchCount ?? 8,
    similarityThreshold: options.similarityThreshold ?? DEFAULT_THRESHOLD
  });

  // フィーチャーフラグに基づいて検索方法を切り替え
  if (michelleServerEnv.useSinrRag) {
    console.log("[RAG] Using SINR search (child chunks → parent chunks)");
    const sinrMatches = await retrieveSinrMatches(embedding, options);

    // SINRで結果が得られなければ既存RAGにフォールバック
    if (sinrMatches.length === 0) {
      console.log("[RAG] SINR returned 0 matches, falling back to original RAG");
      return retrieveOriginalMatches(embedding, options);
    }

    console.log(`[RAG] SINR search successful, returning ${sinrMatches.length} matches`);
    return sinrMatches;
  }

  // デフォルト：既存RAG検索
  console.log("[RAG] Using original RAG search (1000-char chunks)");
  const originalMatches = await retrieveOriginalMatches(embedding, options);
  console.log(`[RAG] Original search completed, returning ${originalMatches.length} matches`);
  return originalMatches;
};
