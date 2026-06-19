"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { KnowledgeCard } from "@prisma/client";
import {
  SOURCE_TYPES,
  CATEGORIES,
  PRIORITIES,
  SOURCE_TYPE_LABEL,
  CATEGORY_LABEL,
} from "@/lib/cardFrontmatter";
import {
  generateCardFromInput,
  type GenerateResult,
} from "@/app/actions/cards";

type Props = {
  manualAction: (formData: FormData) => void | Promise<void>;
  card?: KnowledgeCard | null;
  submitLabel: string;
  showAiPanel?: boolean;
};

export function CardForm({ manualAction, card, submitLabel, showAiPanel }: Props) {
  const [aiInput, setAiInput] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiRaw, setAiRaw] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      {showAiPanel && (
        <section className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">✦ AI 生成</span>
            <span className="text-xs text-muted">
              粘贴链接、X 帖、README 段落或一段想法，由 Claude 生成结构化卡片
            </span>
          </div>
          <textarea
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            rows={6}
            placeholder="粘贴 GitHub URL / X 帖正文 / 文章片段 / 想法…"
            className="input resize-y"
          />
          {aiError && (
            <div className="text-sm text-rose-500 space-y-1">
              <div>生成失败：{aiError}</div>
              {aiRaw && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted">
                    查看模型原始输出
                  </summary>
                  <pre className="mt-1 p-2 rounded bg-card border border-border overflow-auto whitespace-pre-wrap">
                    {aiRaw}
                  </pre>
                </details>
              )}
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              className="btn-primary"
              disabled={pending || !aiInput.trim()}
              onClick={() => {
                setAiError(null);
                setAiRaw(null);
                start(async () => {
                  let result: GenerateResult;
                  try {
                    result = await generateCardFromInput(aiInput);
                  } catch (e) {
                    // server action redirect throws — treat as success
                    if (
                      e instanceof Error &&
                      /NEXT_REDIRECT/.test(e.message)
                    ) {
                      throw e;
                    }
                    setAiError(e instanceof Error ? e.message : String(e));
                    return;
                  }
                  if (!result.ok) {
                    setAiError(result.error);
                    setAiRaw(result.rawOutput ?? null);
                  }
                });
              }}
            >
              {pending ? "生成中…" : "生成卡片"}
            </button>
          </div>
        </section>
      )}

      <form action={manualAction} className="space-y-4">
        <div className="text-sm text-muted">手动编辑全部字段</div>

        <div>
          <label className="label">标题 *</label>
          <input
            name="title"
            required
            defaultValue={card?.title ?? ""}
            className="input"
          />
        </div>

        <div>
          <label className="label">摘要（一句话总结）</label>
          <input
            name="summary"
            defaultValue={card?.summary ?? ""}
            className="input"
          />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label">sourceType</label>
            <select
              name="sourceType"
              defaultValue={card?.sourceType ?? "manual"}
              className="input"
            >
              {SOURCE_TYPES.map((s) => (
                <option key={s} value={s}>
                  {s} · {SOURCE_TYPE_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">category</label>
            <select
              name="category"
              defaultValue={card?.category ?? "thinking"}
              className="input"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c} · {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">priority</label>
            <select
              name="priority"
              defaultValue={card?.priority ?? "P2"}
              className="input"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">sourceUrl</label>
            <input
              name="sourceUrl"
              type="url"
              defaultValue={card?.sourceUrl ?? ""}
              placeholder="https://…"
              className="input"
            />
          </div>
          <div>
            <label className="label">score (0-100)</label>
            <input
              name="score"
              type="number"
              min={0}
              max={100}
              defaultValue={card?.score ?? 0}
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="label">标签（逗号分隔）</label>
          <input
            name="tags"
            defaultValue={card?.tags ?? ""}
            placeholder="AI编程, Agent工程化, 公众号素材"
            className="input"
          />
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="shouldSave"
              defaultChecked={card?.shouldSave ?? true}
            />
            shouldSave（入库）
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="publish"
              defaultChecked={card?.publish ?? false}
            />
            publish（公开展示）
          </label>
        </div>

        <div>
          <label className="label">Markdown body</label>
          <textarea
            name="body"
            rows={14}
            defaultValue={card?.body ?? ""}
            placeholder="# 标题…"
            className="input font-mono text-xs resize-y"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link href="/admin" className="btn-ghost">
            取消
          </Link>
          <button type="submit" className="btn-primary">
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
