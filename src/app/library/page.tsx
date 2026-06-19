import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CardItem } from "@/components/CardItem";
import { CardFilters } from "@/components/CardFilters";
import { listCards, listFilterFacets } from "@/lib/cards";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    sourceType?: string;
    priority?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/library");
  if (!session.user.isAdmin) {
    return (
      <div className="rounded-lg border border-border p-8 text-center">
        <p className="text-muted">私库仅管理员可见</p>
      </div>
    );
  }

  const { q, category, sourceType, priority } = await searchParams;

  const [cards, facets] = await Promise.all([
    listCards({
      userId: session.user.id,
      q,
      category,
      sourceType,
      priority,
      savedOnly: true,
    }),
    listFilterFacets("library"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">私库</h1>
          <p className="text-sm text-muted mt-1">
            {cards.length} 张已入库（含未公开）· 按优先级排序
          </p>
        </div>
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="搜索…"
            className="input max-w-xs"
          />
          {category && <input type="hidden" name="category" value={category} />}
          {sourceType && (
            <input type="hidden" name="sourceType" value={sourceType} />
          )}
          {priority && <input type="hidden" name="priority" value={priority} />}
          <button className="btn-outline" type="submit">
            搜索
          </button>
        </form>
      </div>

      <CardFilters
        basePath="/library"
        facets={facets}
        active={{ category, sourceType, priority }}
        keepQuery={{ q }}
      />

      {cards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted">
          私库为空
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <CardItem
              key={c.id}
              card={c}
              isFavorite={c.isFavorite}
              canFavorite
              showAdminHint
            />
          ))}
        </div>
      )}
    </div>
  );
}
