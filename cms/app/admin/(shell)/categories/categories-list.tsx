"use client";

import { DataTable } from "@/components/admin/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDate } from "@/lib/format";
import type { Category } from "@/lib/types";

export function CategoriesList({ categories }: { categories: Category[] }) {
  return (
    <DataTable
      rows={categories}
      href={(c) => `/admin/categories/${c.id}`}
      searchable
      searchPlaceholder="Search categories…"
      filterFn={(c, q) => c.name.toLowerCase().includes(q)}
      columns={[
        { key: "name", header: "Name", render: (c) => c.name },
        {
          key: "status",
          header: "Status",
          render: (c) => (
            <StatusPill status={c.published ? "published" : "draft"} />
          ),
        },
        {
          key: "created",
          header: "Created",
          render: (c) => (
            <span className="text-ink-muted">{formatDate(c.created_at)}</span>
          ),
        },
        {
          key: "modified",
          header: "Modified",
          render: (c) => (
            <span className="text-ink-muted">{formatDate(c.updated_at)}</span>
          ),
        },
      ]}
    />
  );
}
