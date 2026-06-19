import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CardForm } from "@/components/CardForm";
import { updateCard } from "@/app/actions/cards";

export default async function EditCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/");

  const { id } = await params;
  const card = await prisma.knowledgeCard.findUnique({ where: { id } });
  if (!card) notFound();

  const action = updateCard.bind(null, card.id);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">编辑卡片</h1>
      <CardForm manualAction={action} card={card} submitLabel="保存" />
    </div>
  );
}
