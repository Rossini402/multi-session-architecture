"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type BookmarkInput = {
  title: string;
  url: string;
  description?: string;
  category?: string;
  tags?: string;
};

function parseAndValidate(formData: FormData): BookmarkInput {
  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const tags = String(formData.get("tags") ?? "").trim();

  if (!title) throw new Error("标题不能为空");
  if (!url) throw new Error("URL 不能为空");
  try {
    new URL(url);
  } catch {
    throw new Error("URL 格式无效");
  }

  return {
    title,
    url,
    description: description || undefined,
    category: category || undefined,
    tags: tags || undefined,
  };
}

async function ensureAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error("UNAUTHORIZED");
  }
  return session.user.id;
}

export async function createBookmark(formData: FormData) {
  const userId = await ensureAdmin();
  const data = parseAndValidate(formData);

  await prisma.bookmark.create({
    data: { ...data, createdById: userId },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateBookmark(id: string, formData: FormData) {
  await ensureAdmin();
  const data = parseAndValidate(formData);

  await prisma.bookmark.update({
    where: { id },
    data,
  });

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin");
}

export async function deleteBookmark(id: string) {
  await ensureAdmin();
  await prisma.bookmark.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/admin");
}
