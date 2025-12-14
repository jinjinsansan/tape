import { promises as fs } from "node:fs";
import path from "node:path";

const MICHELLE_KNOWLEDGE_BASE = path.join(process.cwd(), "apps/web/md/michelle");

export type KnowledgeChunk = {
  id: string;
  title: string;
  relativePath: string;
  summary: string;
  keyPoints: string[];
  content: string;
};

export type KnowledgeChunkSummary = Omit<KnowledgeChunk, "content">;

let chunkCache: KnowledgeChunk[] | null = null;

const encodeId = (relativePath: string) =>
  Buffer.from(relativePath).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const decodeId = (id: string) => {
  const normalized = id.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64").toString("utf8");
};

const collectMarkdownFiles = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
};

const sanitizeText = (value: string) =>
  value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#>*`_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractKeyPoints = (content: string): string[] => {
  const bulletMatches = [...content.matchAll(/^[-*+]\s+(.+)$/gim)].map((m) => m[1].trim());
  if (bulletMatches.length) {
    return bulletMatches.slice(0, 4);
  }
  const sentences = sanitizeText(content)
    .split(/[。.!?]/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  return sentences.slice(0, 4);
};

const summarizeContent = (content: string) => {
  const sanitized = sanitizeText(content);
  return sanitized.slice(0, 420);
};

const loadChunks = async (): Promise<KnowledgeChunk[]> => {
  const exists = await fs
    .access(MICHELLE_KNOWLEDGE_BASE)
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    return [];
  }

  const files = await collectMarkdownFiles(MICHELLE_KNOWLEDGE_BASE);
  const chunks: KnowledgeChunk[] = [];
  for (const absolutePath of files) {
    const relativePath = path.relative(MICHELLE_KNOWLEDGE_BASE, absolutePath);
    const content = await fs.readFile(absolutePath, "utf8");
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch?.[1]?.trim() ?? relativePath.replace(/\.md$/, "");
    const summary = summarizeContent(content);
    const keyPoints = extractKeyPoints(content);
    chunks.push({
      id: encodeId(relativePath),
      title,
      relativePath,
      summary,
      keyPoints,
      content
    });
  }
  return chunks;
};

const ensureChunks = async () => {
  if (!chunkCache) {
    chunkCache = await loadChunks();
  }
  return chunkCache;
};

export const invalidateKnowledgeCache = () => {
  chunkCache = null;
};

export const searchKnowledgeChunks = async (
  query?: string | null,
  limit = 30,
  random = false
): Promise<KnowledgeChunkSummary[]> => {
  const chunks = await ensureChunks();
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
  const relativePath = decodeId(id);
  const chunks = await ensureChunks();
  return chunks.find((chunk) => chunk.relativePath === relativePath) ?? null;
};
