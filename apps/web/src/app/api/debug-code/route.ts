import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";

export const dynamic = "force-dynamic";

export async function GET() {
  const cwd = process.cwd();
  const filePath = path.join(cwd, "src", "app", "api", "sinr-process-all", "route.ts");
  
  try {
    const code = await fs.readFile(filePath, "utf-8");
    const lines = code.split("\n");
    const relevantLines = lines.slice(0, 20);
    
    return NextResponse.json({
      cwd,
      filePath,
      exists: true,
      firstLines: relevantLines,
      lineCount: lines.length
    });
  } catch (error) {
    return NextResponse.json({
      cwd,
      filePath,
      exists: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
