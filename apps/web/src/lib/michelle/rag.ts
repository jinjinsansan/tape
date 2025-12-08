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

export const embedText = async (text: string) => {
  const normalized = text.trim();
  if (!normalized) return [] as number[];

  const client = getMichelleOpenAIClient();
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: normalized
  });
  return response.data[0]?.embedding ?? [];
};

type RetrieveOptions = {
  matchCount?: number;
  similarityThreshold?: number;
};

const retrieveOriginalMatches = async (embedding: number[], options: RetrieveOptions) => {
  const supabase = getSupabaseAdminClient();

  const thresholds = [options.similarityThreshold ?? DEFAULT_THRESHOLD, ...FALLBACK_THRESHOLDS]
    .filter((value, index, arr) => value > 0 && arr.indexOf(value) === index)
    .sort((a, b) => b - a);

  for (const threshold of thresholds) {
    const { data, error } = await supabase.rpc("match_michelle_knowledge", {
      query_embedding: embedding,
      match_count: options.matchCount ?? 8,
      similarity_threshold: threshold
    } as never);

    if (error) {
      console.error("match_michelle_knowledge error", error);
      continue;
    }

    if (data && data.length) {
      return data as KnowledgeMatch[];
    }
  }

  return [] as KnowledgeMatch[];
};

const retrieveSinrMatches = async (embedding: number[], options: RetrieveOptions) => {
  const supabase = getSupabaseAdminClient();

  const thresholds = [options.similarityThreshold ?? DEFAULT_THRESHOLD, ...FALLBACK_THRESHOLDS]
    .filter((value, index, arr) => value > 0 && arr.indexOf(value) === index)
    .sort((a, b) => b - a);

  for (const threshold of thresholds) {
    const { data, error } = await supabase.rpc("match_michelle_knowledge_sinr", {
      query_embedding: embedding,
      match_count: options.matchCount ?? 8,
      similarity_threshold: threshold
    } as never);

    if (error) {
      console.error("match_michelle_knowledge_sinr error", error);
      continue;
    }

    const matches = (data ?? []) as SinrMatch[];
    if (matches.length) {
      return matches.map((match) => ({
        id: match.parent_id,
        content: match.parent_content,
        metadata: match.parent_metadata,
        similarity: match.child_similarity
      }));
    }
  }

  return [] as KnowledgeMatch[];
};

export const retrieveKnowledgeMatches = async (text: string, options: RetrieveOptions = {}) => {
  const embedding = await embedText(text);
  if (!embedding.length) return [] as KnowledgeMatch[];

  if (michelleServerEnv.useSinrRag) {
    const sinrMatches = await retrieveSinrMatches(embedding, options);
    if (sinrMatches.length) {
      return sinrMatches;
    }
  }

  return retrieveOriginalMatches(embedding, options);
};
