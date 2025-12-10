import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET() {
  const cwd = process.cwd();
  
  const paths = {
    cwd,
    attempt1: path.join(cwd, "md", "michelle"),
    attempt2: path.join(cwd, "apps", "web", "md", "michelle"),
    attempt3: path.resolve(cwd, "..", "..", "md", "michelle"),
  };

  const results: Record<string, any> = {};

  for (const [key, testPath] of Object.entries(paths)) {
    try {
      const stat = await fs.stat(testPath);
      if (stat.isDirectory()) {
        const files = await fs.readdir(testPath);
        results[key] = {
          path: testPath,
          exists: true,
          isDirectory: true,
          fileCount: files.length,
          sampleFiles: files.slice(0, 5)
        };
      } else {
        results[key] = { path: testPath, exists: true, isDirectory: false };
      }
    } catch (error) {
      results[key] = {
        path: testPath,
        exists: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  return NextResponse.json(results, { status: 200 });
}
