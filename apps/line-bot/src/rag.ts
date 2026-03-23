/** RAG — queries psychology knowledge in Supabase */

import { getOpenAI } from "./openai.js";
import { supabase } from "./supabase.js";

const EMBEDDING_MODEL = "text-embedding-3-small";
const FALLBACK_THRESHOLDS = [0.58, 0.5, 0.45, 0.35];

export type KnowledgeMatch = {
  id: string;
  content: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
};

async function embedText(text: string): Promise<number[]> {
  const normalized = text.trim();
  if (!normalized) return [];

  const response = await getOpenAI().embeddings.create({
    model: EMBEDDING_MODEL,
    input: normalized,
  });
  return response.data[0]?.embedding ?? [];
}

async function searchRpc(
  embedding: number[],
  matchCount: number,
  initialThreshold: number,
): Promise<KnowledgeMatch[]> {
  const thresholds = [initialThreshold, ...FALLBACK_THRESHOLDS]
    .filter((v, i, a) => v > 0 && a.indexOf(v) === i)
    .sort((a, b) => b - a);

  for (const threshold of thresholds) {
    const { data, error } = await supabase.rpc("match_michelle_knowledge", {
      query_embedding: embedding,
      match_count: matchCount,
      similarity_threshold: threshold,
    } as never);

    if (error) {
      console.error("RAG search error:", error.message);
      return [];
    }
    if (data && (data as KnowledgeMatch[]).length > 0) {
      return data as KnowledgeMatch[];
    }
  }
  return [];
}

/**
 * Search psychology knowledge base.
 */
export async function retrieveKnowledge(
  text: string,
  matchCount = 6,
  initialThreshold = 0.45,
): Promise<KnowledgeMatch[]> {
  const embedding = await embedText(text);
  if (!embedding.length) return [];

  return searchRpc(embedding, matchCount, initialThreshold);
}

export function formatKnowledgeContext(matches: KnowledgeMatch[]): string {
  if (!matches.length) return "";
  const chunks = matches
    .map((m, i) => `[心理学知識${i + 1}]\n${m.content}`)
    .join("\n\n");
  return `\n\n---\n内部参考情報（ユーザーには見せないこと）：\n${chunks}`;
}
