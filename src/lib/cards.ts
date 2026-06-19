import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const PRIORITY_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

export type CardListOpts = {
  userId?: string;
  category?: string;
  sourceType?: string;
  priority?: string;
  q?: string;
  publishedOnly?: boolean;
  savedOnly?: boolean;
};

export async function listCards(opts: CardListOpts) {
  const where: Prisma.KnowledgeCardWhereInput = {};
  if (opts.category) where.category = opts.category;
  if (opts.sourceType) where.sourceType = opts.sourceType;
  if (opts.priority) where.priority = opts.priority;
  if (opts.publishedOnly) where.publish = true;
  if (opts.savedOnly) where.shouldSave = true;
  if (opts.q) {
    where.OR = [
      { title: { contains: opts.q } },
      { summary: { contains: opts.q } },
      { body: { contains: opts.q } },
      { tags: { contains: opts.q } },
      { sourceUrl: { contains: opts.q } },
    ];
  }

  const cards = await prisma.knowledgeCard.findMany({
    where,
    orderBy: [{ priority: "asc" }, { score: "desc" }, { createdAt: "desc" }],
    include: opts.userId
      ? { favorites: { where: { userId: opts.userId }, select: { id: true } } }
      : undefined,
  });

  // Prisma 默认按字符串排 priority 会得到 P0<P1<P2<P3，正合心意
  return cards
    .map((c) => {
      const withFavs = c as typeof c & { favorites?: { id: string }[] };
      return {
        ...c,
        isFavorite: (withFavs.favorites?.length ?? 0) > 0,
      };
    })
    .sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 9;
      const pb = PRIORITY_ORDER[b.priority] ?? 9;
      if (pa !== pb) return pa - pb;
      return b.score - a.score;
    });
}

export async function listFilterFacets(scope: "public" | "library") {
  const where: Prisma.KnowledgeCardWhereInput =
    scope === "public" ? { publish: true } : { shouldSave: true };

  const [categories, sourceTypes, priorities] = await Promise.all([
    prisma.knowledgeCard.findMany({
      where,
      select: { category: true },
      distinct: ["category"],
    }),
    prisma.knowledgeCard.findMany({
      where,
      select: { sourceType: true },
      distinct: ["sourceType"],
    }),
    prisma.knowledgeCard.findMany({
      where,
      select: { priority: true },
      distinct: ["priority"],
    }),
  ]);

  return {
    categories: categories.map((c) => c.category).sort(),
    sourceTypes: sourceTypes.map((s) => s.sourceType).sort(),
    priorities: priorities.map((p) => p.priority).sort(),
  };
}
