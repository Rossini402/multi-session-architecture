import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MarkdownBody } from "@/components/MarkdownBody";
import {
  PriorityBadge,
  ScoreBadge,
  SourceTypeBadge,
  CategoryBadge,
} from "@/components/Badges";
import { FavoriteButton } from "@/components/FavoriteButton";
import { tagsToArray } from "@/lib/cardFrontmatter";

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const card = await prisma.knowledgeCard.findUnique({
    where: { id },
    include: session?.user
      ? {
          favorites: {
            where: { userId: session.user.id },
            select: { id: true },
          },
        }
      : undefined,
  });
  if (!card) notFound();

  const isAdmin = !!session?.user?.isAdmin;
  if (!card.publish && !isAdmin) notFound();

  const isFavorite =
    "favorites" in card
      ? ((card as { favorites?: { id: string }[] }).favorites?.length ?? 0) > 0
      : false;
  const tags = tagsToArray(card.tags);

  return (
    <article className="max-w-3xl mx-auto space-y-6">
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={card.priority} />
          <ScoreBadge score={card.score} />
          <CategoryBadge category={card.category} />
          <SourceTypeBadge sourceType={card.sourceType} />
          {!card.publish && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-500/15 text-muted">
              草稿
            </span>
          )}
          {session?.user && (
            <span className="ml-auto">
              <FavoriteButton cardId={card.id} isFavorite={isFavorite} />
            </span>
          )}
        </div>

        <h1 className="text-3xl font-semibold tracking-tight">{card.title}</h1>

        {card.summary && (
          <p className="text-muted leading-relaxed">{card.summary}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          {card.sourceUrl && (
            <a
              href={card.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              {card.sourceUrl}
            </a>
          )}
          {card.sourceUrl && tags.length > 0 && <span>·</span>}
          {tags.map((t) => (
            <span key={t}>#{t}</span>
          ))}
        </div>

        {isAdmin && (
          <div className="flex gap-2 pt-2">
            <Link
              href={`/admin/${card.id}/edit`}
              className="btn-outline text-xs"
            >
              编辑
            </Link>
          </div>
        )}
      </header>

      <MarkdownBody>{card.body}</MarkdownBody>
    </article>
  );
}
