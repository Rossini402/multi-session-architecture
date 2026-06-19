import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CardForm } from "@/components/CardForm";
import { createCardManual } from "@/app/actions/cards";

export default async function NewCardPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/");

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">新增卡片</h1>
      <CardForm
        manualAction={createCardManual}
        submitLabel="创建"
        showAiPanel
      />
    </div>
  );
}
