import { readFile } from "node:fs/promises";
import path from "node:path";

let cached: string | null = null;

export async function getSystemPrompt(): Promise<string> {
  if (cached) return cached;
  const file = path.join(process.cwd(), "prompts", "tech-radar-agent.md");
  cached = await readFile(file, "utf8");
  return cached;
}
