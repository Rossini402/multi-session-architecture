import matter from "gray-matter";

export const SOURCE_TYPES = [
  "github",
  "x",
  "article",
  "video",
  "tool",
  "idea",
  "manual",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const CATEGORIES = [
  "github-project",
  "ai-coding",
  "agent-engineering",
  "context-engineering",
  "frontend",
  "iot",
  "product-thinking",
  "content-idea",
  "career",
  "tool",
  "thinking",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const PRIORITIES = ["P0", "P1", "P2", "P3"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  "github-project": "GitHub 项目",
  "ai-coding": "AI 编程",
  "agent-engineering": "Agent 工程化",
  "context-engineering": "Context Engineering",
  frontend: "前端工程化",
  iot: "IoT / 工业互联网",
  "product-thinking": "产品思考",
  "content-idea": "内容创作",
  career: "职业发展",
  tool: "工具",
  thinking: "认知 / 方法论",
};

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  github: "GitHub",
  x: "X",
  article: "文章",
  video: "视频",
  tool: "工具",
  idea: "想法",
  manual: "手动",
};

export type ParsedCard = {
  title: string;
  sourceType: SourceType;
  sourceUrl: string | null;
  category: Category;
  tags: string | null;
  score: number;
  priority: Priority;
  shouldSave: boolean;
  publish: boolean;
  summary: string | null;
  body: string;
};

function pickEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  return fallback;
}

function pickString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function pickBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function pickScore(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function pickTags(value: unknown): string | null {
  if (Array.isArray(value)) {
    const cleaned = value
      .map((t) => (typeof t === "string" ? t.trim() : ""))
      .filter(Boolean);
    return cleaned.length ? cleaned.join(",") : null;
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .join(",");
  }
  return null;
}

export function parseCardMarkdown(raw: string): ParsedCard {
  const { data, content } = matter(raw.trim());

  const title = pickString(data.title) ?? "未命名卡片";
  const summary = pickString(data.summary);
  const body = content.trim();

  return {
    title,
    sourceType: pickEnum(data.sourceType, SOURCE_TYPES, "manual"),
    sourceUrl: pickString(data.sourceUrl),
    category: pickEnum(data.category, CATEGORIES, "thinking"),
    tags: pickTags(data.tags),
    score: pickScore(data.score),
    priority: pickEnum(data.priority, PRIORITIES, "P2"),
    shouldSave: pickBool(data.shouldSave, true),
    publish: pickBool(data.publish, false),
    summary,
    body,
  };
}

export function tagsToArray(csv: string | null | undefined): string[] {
  if (!csv) return [];
  return csv
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
