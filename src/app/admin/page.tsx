import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DeleteCardButton } from "@/components/DeleteCardButton";
import { PriorityBadge, ScoreBadge } from "@/components/Badges";

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

  const cards = await prisma.knowledgeCard.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">管理</h1>
          <p className="text-sm text-muted mt-1">{cards.length} 张卡片</p>
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
              <th className="text-left px-4 py-2 font-medium hidden md:table-cell">
                来源
              </th>
              <th className="text-left px-4 py-2 font-medium hidden lg:table-cell">
                优先 / 分
              </th>
              <th className="text-left px-4 py-2 font-medium hidden lg:table-cell">
                状态
              </th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {cards.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <Link
                    href={`/cards/${c.id}`}
                    className="font-medium hover:text-accent"
                  >
                    {c.title}
                  </Link>
                  {c.summary && (
                    <div className="text-xs text-muted line-clamp-1 mt-0.5">
                      {c.summary}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted text-xs">
                  {c.category}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted text-xs">
                  {c.sourceType}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <div className="flex items-center gap-1.5">
                    <PriorityBadge priority={c.priority} />
                    <ScoreBadge score={c.score} />
                  </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className={c.shouldSave ? "" : "text-muted"}>
                      {c.shouldSave ? "已入库" : "未入库"}
                    </span>
                    <span
                      className={
                        c.publish ? "text-emerald-500" : "text-muted"
                      }
                    >
                      {c.publish ? "已发布" : "草稿"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    <Link
                      href={`/admin/${c.id}/edit`}
                      className="btn-ghost text-xs"
                    >
                      编辑
                    </Link>
                    <DeleteCardButton id={c.id} title={c.title} />
                  </div>
                </td>
              </tr>
            ))}
            {cards.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted text-sm"
                >
                  还没有卡片，
                  <Link href="/admin/new" className="text-accent">
                    添加第一张
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
