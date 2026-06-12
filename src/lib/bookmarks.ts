import { prisma } from "@/lib/prisma";

export type BookmarkWithFavorite = Awaited<
  ReturnType<typeof listBookmarks>
>[number];

export async function listBookmarks(opts: {
  userId?: string;
  category?: string;
  q?: string;
}) {
  const bookmarks = await prisma.bookmark.findMany({
    where: {
      ...(opts.category ? { category: opts.category } : {}),
      ...(opts.q
        ? {
            OR: [
              { title: { contains: opts.q } },
              { description: { contains: opts.q } },
              { url: { contains: opts.q } },
              { tags: { contains: opts.q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: opts.userId
      ? {
          favorites: { where: { userId: opts.userId }, select: { id: true } },
        }
      : undefined,
  });

  return bookmarks.map((b) => {
    const withFavs = b as typeof b & { favorites?: { id: string }[] };
    return {
      ...b,
      isFavorite: (withFavs.favorites?.length ?? 0) > 0,
    };
  });
}

export async function listCategories(): Promise<string[]> {
  const rows = await prisma.bookmark.findMany({
    where: { category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  });
  return rows
    .map((r) => r.category)
    .filter((c): c is string => !!c)
    .sort();
}

export function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
