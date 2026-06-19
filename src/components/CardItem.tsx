import type { KnowledgeCard } from "@prisma/client";
import Link from "next/link";
import { tagsToArray } from "@/lib/cardFrontmatter";
import {
  PriorityBadge,
  ScoreBadge,
  SourceTypeBadge,
  CategoryBadge,
} from "@/components/Badges";
import { FavoriteButton } from "@/components/FavoriteButton";

type Props = {
  card: KnowledgeCard;
  isFavorite: boolean;
  canFavorite: boolean;
  showAdminHint?: boolean;
};

export function CardItem({ card, isFavorite, canFavorite, showAdminHint }: Props) {
  const tags = tagsToArray(card.tags);

  return (
    <article className="group rounded-lg border border-border bg-card p-4 hover:border-accent/40 transition-colors flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          <PriorityBadge priority={card.priority} />
          <ScoreBadge score={card.score} />
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/cards/${card.id}`}
            className="font-medium leading-snug line-clamp-2 group-hover:text-accent"
          >
            {card.title}
          </Link>
          <div className="flex items-center gap-2 mt-0.5">
            <SourceTypeBadge sourceType={card.sourceType} />
            {card.sourceUrl && (
              <a
                href={card.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted truncate hover:text-accent"
              >
                {safeHost(card.sourceUrl)}
              </a>
            )}
          </div>
        </div>
        {canFavorite && (
          <FavoriteButton cardId={card.id} isFavorite={isFavorite} />
        )}
      </div>

      {card.summary && (
        <p className="text-sm text-muted line-clamp-3">{card.summary}</p>
      )}

      <div className="flex flex-wrap items-center gap-1 mt-auto pt-1">
        <CategoryBadge category={card.category} />
        {tags.slice(0, 4).map((t) => (
          <span
            key={t}
            className="text-[10px] px-1.5 py-0.5 rounded bg-border/50 text-muted"
          >
            #{t}
          </span>
        ))}
        {tags.length > 4 && (
          <span className="text-[10px] text-muted">+{tags.length - 4}</span>
        )}
        {showAdminHint && !card.publish && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-500/15 text-muted ml-auto">
            草稿
          </span>
        )}
      </div>
    </article>
  );
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
