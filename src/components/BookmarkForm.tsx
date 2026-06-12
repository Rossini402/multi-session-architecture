import type { Bookmark } from "@prisma/client";
import Link from "next/link";

export function BookmarkForm({
  action,
  bookmark,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  bookmark?: Bookmark | null;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label">URL *</label>
        <input
          name="url"
          type="url"
          required
          defaultValue={bookmark?.url ?? ""}
          placeholder="https://example.com"
          className="input"
        />
      </div>

      <div>
        <label className="label">标题 *</label>
        <input
          name="title"
          required
          defaultValue={bookmark?.title ?? ""}
          placeholder="网站名"
          className="input"
        />
      </div>

      <div>
        <label className="label">描述</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={bookmark?.description ?? ""}
          placeholder="这个网站是做什么的？"
          className="input resize-none"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">分类</label>
          <input
            name="category"
            defaultValue={bookmark?.category ?? ""}
            placeholder="例如：学习资源"
            className="input"
          />
        </div>
        <div>
          <label className="label">标签（逗号分隔）</label>
          <input
            name="tags"
            defaultValue={bookmark?.tags ?? ""}
            placeholder="react, ai, design"
            className="input"
          />
        </div>
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
  );
}
