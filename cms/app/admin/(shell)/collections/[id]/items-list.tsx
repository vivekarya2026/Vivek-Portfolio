"use client";

import { DataTable } from "@/components/admin/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/format";
import type { CmsItem } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteItem } from "../actions";

export function ItemsList({
  items,
  collectionId,
}: {
  items: CmsItem[];
  collectionId: string;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [, startDelete] = useTransition();

  function onDelete(item: CmsItem) {
    if (!confirm(`Delete "${item.name}"? This can't be undone.`)) return;
    startDelete(async () => {
      const res = await deleteItem(item.id, collectionId);
      if (res.ok) {
        notify("Item deleted");
        router.refresh();
      } else notify(res.error ?? "Couldn't delete", "error");
    });
  }

  return (
    <DataTable
      rows={items}
      href={(item) => `/admin/collections/${collectionId}/items/${item.id}`}
      searchable
      searchPlaceholder="Search items…"
      onDelete={onDelete}
      filterFn={(item, q) =>
        `${item.name} ${item.slug}`.toLowerCase().includes(q)
      }
      columns={[
        { key: "name", header: "Name", render: (item) => item.name },
        {
          key: "slug",
          header: "Slug",
          render: (item) => (
            <span className="text-ink-muted">{item.slug}</span>
          ),
        },
        {
          key: "status",
          header: "Status",
          render: (item) => <StatusPill status={item.status} />,
        },
        {
          key: "modified",
          header: "Modified",
          render: (item) => (
            <span className="text-ink-muted">
              {formatDate(item.updated_at)}
            </span>
          ),
        },
      ]}
    />
  );
}
