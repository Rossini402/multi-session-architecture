import Link from "next/link";
import { CATEGORY_LABEL, SOURCE_TYPE_LABEL } from "@/lib/cardFrontmatter";

type Active = {
  category?: string;
  sourceType?: string;
  priority?: string;
};

type Facets = {
  categories: string[];
  sourceTypes: string[];
  priorities: string[];
};

export function CardFilters({
  basePath,
  facets,
  active,
  keepQuery,
}: {
  basePath: string;
  facets: Facets;
  active: Active;
  keepQuery?: Record<string, string | undefined>;
}) {
  const buildHref = (next: Partial<Active>) => {
    const params = new URLSearchParams();
    const merged: Active = { ...active, ...next };
    if (merged.category) params.set("category", merged.category);
    if (merged.sourceType) params.set("sourceType", merged.sourceType);
    if (merged.priority) params.set("priority", merged.priority);
    for (const [k, v] of Object.entries(keepQuery ?? {})) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="space-y-2">
      <FilterRow
        label="分类"
        items={facets.categories}
        active={active.category}
        hrefFor={(v) => buildHref({ category: v })}
        clearHref={buildHref({ category: undefined })}
        renderLabel={(v) =>
          (CATEGORY_LABEL as Record<string, string>)[v] ?? v
        }
      />
      <FilterRow
        label="来源"
        items={facets.sourceTypes}
        active={active.sourceType}
        hrefFor={(v) => buildHref({ sourceType: v })}
        clearHref={buildHref({ sourceType: undefined })}
        renderLabel={(v) =>
          (SOURCE_TYPE_LABEL as Record<string, string>)[v] ?? v
        }
      />
      <FilterRow
        label="优先级"
        items={facets.priorities}
        active={active.priority}
        hrefFor={(v) => buildHref({ priority: v })}
        clearHref={buildHref({ priority: undefined })}
      />
    </div>
  );
}

function FilterRow({
  label,
  items,
  active,
  hrefFor,
  clearHref,
  renderLabel,
}: {
  label: string;
  items: string[];
  active?: string;
  hrefFor: (v: string) => string;
  clearHref: string;
  renderLabel?: (v: string) => string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-muted w-12">{label}</span>
      <Link
        href={clearHref}
        className={`btn px-2 py-0.5 text-xs ${
          !active ? "bg-accent text-white" : "btn-outline"
        }`}
      >
        全部
      </Link>
      {items.map((v) => (
        <Link
          key={v}
          href={hrefFor(v)}
          className={`btn px-2 py-0.5 text-xs ${
            active === v ? "bg-accent text-white" : "btn-outline"
          }`}
        >
          {renderLabel ? renderLabel(v) : v}
        </Link>
      ))}
    </div>
  );
}
