import {
  SOURCE_TYPE_LABEL,
  CATEGORY_LABEL,
  type SourceType,
  type Category,
  type Priority,
} from "@/lib/cardFrontmatter";

const PRIORITY_STYLES: Record<Priority, string> = {
  P0: "bg-rose-500/10 text-rose-500 border-rose-500/30",
  P1: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  P2: "bg-sky-500/10 text-sky-500 border-sky-500/30",
  P3: "bg-zinc-500/10 text-muted border-zinc-500/30",
};

const SOURCE_TYPE_GLYPH: Record<SourceType, string> = {
  github: "▣",
  x: "𝕏",
  article: "¶",
  video: "▶",
  tool: "⚒",
  idea: "✦",
  manual: "✎",
};

export function PriorityBadge({ priority }: { priority: string }) {
  const p = (priority as Priority) in PRIORITY_STYLES ? (priority as Priority) : "P2";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${PRIORITY_STYLES[p]}`}
    >
      {p}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 90
      ? "bg-rose-500/15 text-rose-500"
      : score >= 80
        ? "bg-orange-500/15 text-orange-500"
        : score >= 60
          ? "bg-sky-500/15 text-sky-500"
          : "bg-zinc-500/15 text-muted";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}
    >
      {score}
    </span>
  );
}

export function SourceTypeBadge({ sourceType }: { sourceType: string }) {
  const t = (sourceType in SOURCE_TYPE_GLYPH ? sourceType : "manual") as SourceType;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted">
      <span className="font-bold">{SOURCE_TYPE_GLYPH[t]}</span>
      <span>{SOURCE_TYPE_LABEL[t]}</span>
    </span>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  const label = (category in CATEGORY_LABEL ? CATEGORY_LABEL[category as Category] : category);
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-accent/10 text-accent">
      {label}
    </span>
  );
}
