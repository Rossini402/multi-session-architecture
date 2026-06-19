"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function toggleFavorite(cardId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  const userId = session.user.id;

  const existing = await prisma.favorite.findUnique({
    where: { userId_cardId: { userId, cardId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    revalidatePath("/");
    revalidatePath("/library");
    revalidatePath("/favorites");
    return { isFavorite: false };
  }

  await prisma.favorite.create({ data: { userId, cardId } });
  revalidatePath("/");
  revalidatePath("/library");
  revalidatePath("/favorites");
  return { isFavorite: true };
}
