import { auth } from "@/auth";
import { BookmarkCard } from "@/components/BookmarkCard";
import { listBookmarks, listCategories } from "@/lib/bookmarks";
import Link from "next/link";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const session = await auth();
  const { q, category } = await searchParams;

  const [bookmarks, categories] = await Promise.all([
    listBookmarks({ userId: session?.user?.id, q, category }),
    listCategories(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">所有收藏</h1>
          <p className="text-sm text-muted mt-1">
            {bookmarks.length} 个网站 · 点击 ♥ 加入我的收藏
          </p>
        </div>

        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="搜索标题、描述、标签…"
            className="input max-w-xs"
          />
          {category && <input type="hidden" name="category" value={category} />}
          <button className="btn-outline" type="submit">
            搜索
          </button>
        </form>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 text-xs">
          <Link
            href="/"
            className={`btn ${!category ? "bg-accent text-white" : "btn-outline"}`}
          >
            全部
          </Link>
          {categories.map((c) => (
            <Link
              key={c}
              href={`/?category=${encodeURIComponent(c)}`}
              className={`btn ${
                category === c ? "bg-accent text-white" : "btn-outline"
              }`}
            >
              {c}
            </Link>
          ))}
        </div>
      )}

      {bookmarks.length === 0 ? (
        <EmptyState isAdmin={!!session?.user?.isAdmin} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bookmarks.map((b) => (
            <BookmarkCard
              key={b.id}
              bookmark={b}
              isFavorite={b.isFavorite}
              canFavorite={!!session?.user}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-12 text-center">
      <p className="text-muted">还没有收藏</p>
      {isAdmin && (
        <Link href="/admin/new" className="btn-primary mt-4">
          添加第一个网站
        </Link>
      )}
    </div>
  );
}
