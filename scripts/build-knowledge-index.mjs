import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "apps/web/md/michelle");
const OUTPUT_DIR = path.join(ROOT, "apps/web/src/server/data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "michelle-knowledge.json");

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

const encodeId = (relativePath) =>
  Buffer.from(relativePath).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

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

  const files = await collectFiles(SOURCE_DIR);
  const records = [];
  for (const absolutePath of files) {
    const relativePath = path.relative(SOURCE_DIR, absolutePath);
    const content = await fs.readFile(absolutePath, "utf8");
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch?.[1]?.trim() ?? relativePath.replace(/\.md$/, "");
    records.push({
      id: encodeId(relativePath),
      title,
      relativePath,
      summary: summarize(content),
      keyPoints: extractKeyPoints(content),
      content
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
