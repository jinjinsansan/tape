import knowledgeIndex from "@/server/data/michelle-knowledge.json";

export type KnowledgeChunk = {
  id: string;
  title: string;
  relativePath: string;
  summary: string;
  keyPoints: string[];
  content: string;
};

export type KnowledgeChunkSummary = Omit<KnowledgeChunk, "content">;

const chunkCache = knowledgeIndex as KnowledgeChunk[];

export const invalidateKnowledgeCache = () => {
  // no-op when using static index, kept for API compatibility
};

export const searchKnowledgeChunks = async (
  query?: string | null,
  limit = 30,
  random = false
): Promise<KnowledgeChunkSummary[]> => {
  const chunks = chunkCache;
  let list = chunks;
  if (query) {
    const lowered = query.toLowerCase();
    list = list.filter((chunk) =>
      chunk.title.toLowerCase().includes(lowered) || chunk.summary.toLowerCase().includes(lowered)
    );
  }
  if (random && !query) {
    const shuffled = [...list];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    list = shuffled;
  }
  return list.slice(0, limit).map(({ content, ...rest }) => rest);
};

export const getKnowledgeChunkById = async (id: string): Promise<KnowledgeChunk | null> => {
  return chunkCache.find((chunk) => chunk.id === id) ?? null;
};
