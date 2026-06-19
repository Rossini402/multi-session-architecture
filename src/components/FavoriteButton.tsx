"use client";

import { useState, useTransition } from "react";
import { toggleFavorite } from "@/app/actions/favorites";

export function FavoriteButton({
  cardId,
  isFavorite,
}: {
  cardId: string;
  isFavorite: boolean;
}) {
  const [active, setActive] = useState(isFavorite);
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      aria-label={active ? "取消收藏" : "加入收藏"}
      disabled={pending}
      onClick={() => {
        setActive((v) => !v);
        start(async () => {
          const res = await toggleFavorite(cardId);
          setActive(res.isFavorite);
        });
      }}
      className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
        active
          ? "text-rose-500 hover:bg-rose-500/10"
          : "text-muted hover:bg-border/50"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        className="w-4 h-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        />
      </svg>
    </button>
  );
}
