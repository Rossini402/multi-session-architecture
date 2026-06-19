import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CardItem } from "@/components/CardItem";

export default async function FavoritesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/favorites");

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { card: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">我的收藏</h1>
        <p className="text-sm text-muted mt-1">{favorites.length} 张</p>
      </div>

      {favorites.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted">
          还没有收藏，去首页点 ♥ 试试
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((f) => (
            <CardItem
              key={f.id}
              card={f.card}
              isFavorite
              canFavorite
            />
          ))}
        </div>
      )}
    </div>
  );
}
