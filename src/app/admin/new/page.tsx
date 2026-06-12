import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { BookmarkForm } from "@/components/BookmarkForm";
import { createBookmark } from "@/app/actions/bookmarks";

export default async function NewBookmarkPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/");

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">新增收藏</h1>
      <BookmarkForm action={createBookmark} submitLabel="创建" />
    </div>
  );
}
