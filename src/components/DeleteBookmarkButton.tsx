"use client";

import { useTransition } from "react";
import { deleteBookmark } from "@/app/actions/bookmarks";

export function DeleteBookmarkButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const [pending, start] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm(`确认删除「${title}」？`)) {
          start(() => deleteBookmark(id));
        }
      }}
      className="btn-ghost text-xs text-rose-500 hover:bg-rose-500/10"
    >
      删除
    </button>
  );
}
