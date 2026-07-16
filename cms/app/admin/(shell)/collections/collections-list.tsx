"use client";

import { DataTable } from "@/components/admin/data-table";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/format";
import type { CmsCollection } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteCollection } from "./actions";

export function CollectionsList({
  collections,
}: {
  collections: CmsCollection[];
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [, startDelete] = useTransition();

  function onDelete(c: CmsCollection) {
    if (
      !confirm(
        `Delete collection "${c.name}"? All fields and items will be removed.`,
      )
    )
      return;
    startDelete(async () => {
      const res = await deleteCollection(c.id);
      if (res.ok) {
        notify("Collection deleted");
        router.refresh();
      } else notify(res.error ?? "Couldn't delete", "error");
    });
  }

  return (
    <DataTable
      rows={collections}
      href={(c) => `/admin/collections/${c.id}`}
      searchable
      searchPlaceholder="Search collections…"
      onDelete={onDelete}
      filterFn={(c, q) =>
        `${c.name} ${c.slug} ${c.singular_name}`.toLowerCase().includes(q)
      }
      columns={[
        { key: "name", header: "Name", render: (c) => c.name },
        {
          key: "slug",
          header: "Slug",
          render: (c) => <span className="text-ink-muted">{c.slug}</span>,
        },
        {
          key: "singular",
          header: "Singular",
          render: (c) => (
            <span className="text-ink-muted">{c.singular_name || "—"}</span>
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
