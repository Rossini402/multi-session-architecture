import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DeleteBookmarkButton } from "@/components/DeleteBookmarkButton";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin");
  if (!session.user.isAdmin) {
    return (
      <div className="rounded-lg border border-border p-8 text-center">
        <p className="text-muted">你不是管理员，无法访问此页面</p>
      </div>
    );
  }

  const bookmarks = await prisma.bookmark.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">管理</h1>
          <p className="text-sm text-muted mt-1">{bookmarks.length} 条收藏</p>
        </div>
        <Link href="/admin/new" className="btn-primary">
          + 新增
        </Link>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-border/30 text-xs uppercase text-muted">
            <tr>
              <th className="text-left px-4 py-2 font-medium">标题</th>
              <th className="text-left px-4 py-2 font-medium hidden md:table-cell">
                分类
              </th>
              <th className="text-left px-4 py-2 font-medium hidden lg:table-cell">
                创建时间
              </th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {bookmarks.map((b) => (
              <tr key={b.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="font-medium">{b.title}</div>
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted hover:text-accent truncate block max-w-md"
                  >
                    {b.url}
                  </a>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted">
                  {b.category ?? "—"}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-muted text-xs">
                  {b.createdAt.toLocaleDateString("zh-CN")}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    <Link
                      href={`/admin/${b.id}/edit`}
                      className="btn-ghost text-xs"
                    >
                      编辑
                    </Link>
                    <DeleteBookmarkButton id={b.id} title={b.title} />
                  </div>
                </td>
              </tr>
            ))}
            {bookmarks.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-muted text-sm"
                >
                  还没有任何收藏，
                  <Link href="/admin/new" className="text-accent">
                    添加一个
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
