import { z } from "zod";

export const knowledgeChunkSchema = z.object({
  id: z.string(),
  content: z.string(),
  metadata: z.record(z.any()).optional()
});

export type KnowledgeChunk = z.infer<typeof knowledgeChunkSchema>;

export const normalizeChunk = (chunk: KnowledgeChunk): KnowledgeChunk => {
  const parsed = knowledgeChunkSchema.parse(chunk);
  return {
    ...parsed,
    content: parsed.content.trim()
  };
};
