import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BookmarkForm } from "@/components/BookmarkForm";
import { updateBookmark } from "@/app/actions/bookmarks";

export default async function EditBookmarkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/");

  const { id } = await params;
  const bookmark = await prisma.bookmark.findUnique({ where: { id } });
  if (!bookmark) notFound();

  const action = updateBookmark.bind(null, bookmark.id);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">编辑收藏</h1>
      <BookmarkForm action={action} bookmark={bookmark} submitLabel="保存" />
    </div>
  );
}
