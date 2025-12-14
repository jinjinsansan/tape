import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "apps/web/md/michelle");
const OUTPUT_DIR = path.join(ROOT, "apps/web/src/server/data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "michelle-knowledge.json");

const CHUNK_SIZE = Number(process.env.MICHELLE_CHUNK_SIZE) || 220;
const CHUNK_OVERLAP = Number(process.env.MICHELLE_CHUNK_OVERLAP) || 50;

const sanitizeText = (value) =>
  value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#>*`_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const summarize = (content) => sanitizeText(content).slice(0, 420);

const extractKeyPoints = (content) => {
  const bullets = [...content.matchAll(/^[-*+]\s+(.+)$/gim)].map((m) => m[1].trim());
  if (bullets.length) {
    return bullets.slice(0, 4);
  }
  const sentences = sanitizeText(content)
    .split(/[。.!?]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.slice(0, 4);
};

const encodeId = (value) =>
  Buffer.from(value).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const normalizeNewlines = (value) => value.replace(/\r\n/g, "\n");

const stripFrontMatter = (value) => {
  if (!value.startsWith("---")) {
    return value;
  }
  const closing = value.indexOf("\n---", 3);
  if (closing === -1) {
    return value;
  }
  const sliceStart = closing + 4;
  return value.slice(sliceStart);
};

const collectHeadings = (content) => {
  const matches = content.matchAll(/^#{1,6}\s+(.+?)\s*$/gm);
  return [...matches]
    .map((match) => ({
      index: match.index ?? 0,
      title: match[1].trim()
    }))
    .sort((a, b) => a.index - b.index);
};

const chunkMarkdown = (content) => {
  const normalized = normalizeNewlines(content);
  const chunks = [];
  const chunkSize = Math.max(200, CHUNK_SIZE);
  const overlap = Math.min(CHUNK_OVERLAP, Math.max(1, chunkSize - 1));
  const step = Math.max(1, chunkSize - overlap);
  let start = 0;
  let index = 0;

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    const slice = normalized.slice(start, end);
    const leadingWhitespace = slice.length - slice.trimStart().length;
    const trimmed = slice.trim();
    if (trimmed) {
      chunks.push({
        index,
        start: start + leadingWhitespace,
        end: start + leadingWhitespace + trimmed.length,
        content: trimmed
      });
      index += 1;
    }
    if (end === normalized.length) {
      break;
    }
    start += step;
  }

  return chunks;
};

const findSectionHeading = (headings, position) => {
  for (let i = headings.length - 1; i >= 0; i -= 1) {
    const heading = headings[i];
    if (heading.index <= position && heading.title) {
      return heading.title;
    }
  }
  return null;
};
const collectFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
};

const main = async () => {
  const exists = await fs
    .access(SOURCE_DIR)
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    console.error("Source directory not found:", SOURCE_DIR);
    process.exit(1);
  }

  const files = (await collectFiles(SOURCE_DIR)).sort((a, b) => a.localeCompare(b, "ja"));
  const records = [];
  for (const absolutePath of files) {
    const relativePath = path.relative(SOURCE_DIR, absolutePath);
    const rawContent = await fs.readFile(absolutePath, "utf8");
    const content = stripFrontMatter(normalizeNewlines(rawContent)).trimStart();
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const baseTitle = titleMatch?.[1]?.trim() ?? relativePath.replace(/\.md$/, "");
    const headings = collectHeadings(content);
    const chunks = chunkMarkdown(content);
    if (!chunks.length) {
      console.warn(`Skipping ${relativePath}: no readable content`);
      continue;
    }

    chunks.forEach((chunk, idx) => {
      const sectionHeading = findSectionHeading(headings, chunk.start);
      const chunkTitle = sectionHeading ? `${baseTitle}｜${sectionHeading}` : `${baseTitle}｜チャンク${idx + 1}`;
      const uniqueKey = `${relativePath}#${idx}`;

      records.push({
        id: encodeId(uniqueKey),
        title: chunkTitle,
        sourceTitle: baseTitle,
        relativePath,
        summary: summarize(chunk.content),
        keyPoints: extractKeyPoints(chunk.content),
        content: chunk.content,
        chunkIndex: idx,
        chunkCount: chunks.length,
        sectionHeading: sectionHeading ?? null
      });
    });
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(records, null, 2));
  console.log(`Generated ${records.length} knowledge records -> ${OUTPUT_FILE}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
