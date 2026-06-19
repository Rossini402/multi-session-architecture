"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAnthropic, getModel } from "@/lib/anthropic";
import { getSystemPrompt } from "@/lib/prompt";
import {
  parseCardMarkdown,
  SOURCE_TYPES,
  CATEGORIES,
  PRIORITIES,
} from "@/lib/cardFrontmatter";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function ensureAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error("UNAUTHORIZED");
  }
  return session.user.id;
}

export type GenerateResult =
  | { ok: true; cardId: string }
  | { ok: false; error: string; rawOutput?: string };

export async function generateCardFromInput(
  rawInput: string,
): Promise<GenerateResult> {
  const userId = await ensureAdmin();
  const input = rawInput.trim();
  if (!input) return { ok: false, error: "请输入要分析的内容或链接" };

  let text = "";
  try {
    const anthropic = getAnthropic();
    const system = await getSystemPrompt();
    const res = await anthropic.messages.create({
      model: getModel(),
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: input }],
    });
    text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "调用 Anthropic 失败",
    };
  }

  if (!text) {
    return { ok: false, error: "模型返回为空" };
  }

  let parsed;
  try {
    parsed = parseCardMarkdown(text);
  } catch (e) {
    return {
      ok: false,
      error: `解析 frontmatter 失败：${e instanceof Error ? e.message : e}`,
      rawOutput: text,
    };
  }

  const card = await prisma.knowledgeCard.create({
    data: {
      ...parsed,
      rawInput: input,
      createdById: userId,
    },
  });

  revalidatePath("/");
  revalidatePath("/library");
  revalidatePath("/admin");
  redirect(`/cards/${card.id}`);
}

type ManualPayload = {
  title: string;
  sourceType: string;
  sourceUrl: string | null;
  category: string;
  tags: string | null;
  score: number;
  priority: string;
  shouldSave: boolean;
  publish: boolean;
  summary: string | null;
  body: string;
};

function parseManualFormData(formData: FormData): ManualPayload {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const sourceType = get("sourceType") || "manual";
  const category = get("category") || "thinking";
  const priority = get("priority") || "P2";
  if (!(SOURCE_TYPES as readonly string[]).includes(sourceType)) {
    throw new Error("非法 sourceType");
  }
  if (!(CATEGORIES as readonly string[]).includes(category)) {
    throw new Error("非法 category");
  }
  if (!(PRIORITIES as readonly string[]).includes(priority)) {
    throw new Error("非法 priority");
  }
  const title = get("title");
  if (!title) throw new Error("标题不能为空");

  const scoreNum = Math.max(0, Math.min(100, Number(get("score")) || 0));

  return {
    title,
    sourceType,
    sourceUrl: get("sourceUrl") || null,
    category,
    tags: get("tags") || null,
    score: scoreNum,
    priority,
    shouldSave: formData.get("shouldSave") === "on",
    publish: formData.get("publish") === "on",
    summary: get("summary") || null,
    body: get("body"),
  };
}

export async function createCardManual(formData: FormData) {
  const userId = await ensureAdmin();
  const data = parseManualFormData(formData);
  const card = await prisma.knowledgeCard.create({
    data: { ...data, createdById: userId },
  });
  revalidatePath("/");
  revalidatePath("/library");
  revalidatePath("/admin");
  redirect(`/cards/${card.id}`);
}

export async function updateCard(id: string, formData: FormData) {
  await ensureAdmin();
  const data = parseManualFormData(formData);
  await prisma.knowledgeCard.update({ where: { id }, data });
  revalidatePath("/");
  revalidatePath("/library");
  revalidatePath("/admin");
  revalidatePath(`/cards/${id}`);
  redirect(`/cards/${id}`);
}

export async function deleteCard(id: string) {
  await ensureAdmin();
  await prisma.knowledgeCard.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/library");
  revalidatePath("/admin");
}
