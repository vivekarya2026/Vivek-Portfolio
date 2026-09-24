import {
  CollectionHeader,
  EmptyState,
} from "@/components/admin/collection-chrome";
import {
  getCollectionById,
  listItems,
} from "@/lib/data/collections";
import type { CmsCollection, CmsItem } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemsList } from "./items-list";
import { NewItemButton } from "./new-item-button";

export const dynamic = "force-dynamic";

export default async function CollectionItemsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = await getCollectionById(id);
  if (!collection) notFound();

  const col = collection as CmsCollection;
  const items = (await listItems(id)) as CmsItem[];

  return (
    <>
      <CollectionHeader title={col.name} count={items.length}>
        <Link
          href={`/admin/collections/${id}/schema`}
          className="inline-flex h-9 items-center rounded-[--radius-md] border border-border px-3 text-sm text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
        >
          Edit fields
        </Link>
        <NewItemButton collectionId={id} label={col.singular_name || "Item"} />
      </CollectionHeader>
      {items.length === 0 ? (
        <EmptyState
          title={`No ${col.name.toLowerCase()} yet`}
          description={`Create your first ${col.singular_name || "item"}. Define custom fields under Edit fields.`}
          action={
            <NewItemButton
              collectionId={id}
              label={col.singular_name || "Item"}
            />
          }
        />
      ) : (
        <ItemsList items={items} collectionId={id} />
      )}
    </>
  );
}
