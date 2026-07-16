"use client";

import { DataTable } from "@/components/admin/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/format";
import type { Post } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deletePost } from "./actions";

export function PostsList({ posts }: { posts: Post[] }) {
  const router = useRouter();
  const { notify } = useToast();
  const [, startDelete] = useTransition();

  function onDelete(p: Post) {
    if (!confirm(`Delete "${p.title}"? This can't be undone.`)) return;
    startDelete(async () => {
      const res = await deletePost(p.id);
      if (res.ok) {
        notify("Post deleted");
        router.refresh();
      } else notify(res.error ?? "Couldn't delete", "error");
    });
  }

  return (
    <DataTable
      rows={posts}
      href={(p) => `/admin/blog/${p.id}`}
      searchable
      searchPlaceholder="Search posts…"
      onDelete={onDelete}
      filterFn={(p, q) =>
        p.title.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      }
      columns={[
        { key: "title", header: "Name", render: (p) => p.title },
        {
          key: "tags",
          header: "Tags",
          render: (p) => (
            <span className="text-ink-muted">
              {p.tags.length ? p.tags.join(", ") : "—"}
            </span>
          ),
        },
        {
          key: "status",
          header: "Status",
          render: (p) => <StatusPill status={p.status} />,
        },
        {
          key: "modified",
          header: "Modified",
          render: (p) => (
            <span className="text-ink-muted">{formatDate(p.updated_at)}</span>
          ),
        },
      ]}
    />
  );
}
