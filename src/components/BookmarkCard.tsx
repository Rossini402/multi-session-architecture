import type { Bookmark } from "@prisma/client";
import { parseTags } from "@/lib/bookmarks";
import { FavoriteButton } from "@/components/FavoriteButton";

type Props = {
  bookmark: Bookmark;
  isFavorite: boolean;
  canFavorite: boolean;
};

export function BookmarkCard({ bookmark, isFavorite, canFavorite }: Props) {
  const tags = parseTags(bookmark.tags);
  const host = safeHost(bookmark.url);

  return (
    <article className="group rounded-lg border border-border bg-card p-4 hover:border-accent/40 transition-colors flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <Favicon url={bookmark.url} />
        <div className="flex-1 min-w-0">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium leading-snug line-clamp-2 group-hover:text-accent"
          >
            {bookmark.title}
          </a>
          <div className="text-xs text-muted truncate mt-0.5">{host}</div>
        </div>
        {canFavorite && (
          <FavoriteButton bookmarkId={bookmark.id} isFavorite={isFavorite} />
        )}
      </div>

      {bookmark.description && (
        <p className="text-sm text-muted line-clamp-3">{bookmark.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-1">
        {bookmark.category && (
          <span className="text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded bg-accent/10 text-accent">
            {bookmark.category}
          </span>
        )}
        {tags.map((t) => (
          <span
            key={t}
            className="text-[10px] px-1.5 py-0.5 rounded bg-border/50 text-muted"
          >
            #{t}
          </span>
        ))}
      </div>
    </article>
  );
}

function Favicon({ url }: { url: string }) {
  const host = safeHost(url);
  if (!host) return <div className="w-6 h-6 rounded bg-border" />;
  const src = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt=""
      width={24}
      height={24}
      className="w-6 h-6 rounded mt-0.5 shrink-0"
    />
  );
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
