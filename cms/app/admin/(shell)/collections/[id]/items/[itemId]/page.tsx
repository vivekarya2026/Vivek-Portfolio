import { EditorTopbar } from "@/components/admin/editor-chrome";
import {
  getCollectionById,
  getItemById,
  listFields,
} from "@/lib/data/collections";
import type { CmsCollection, CmsField, CmsItem } from "@/lib/types";
import { notFound } from "next/navigation";
import { ItemEditor } from "./item-editor";

export const dynamic = "force-dynamic";

export default async function CollectionItemPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id, itemId } = await params;

  const [collection, item, fields] = await Promise.all([
    getCollectionById(id),
    getItemById(itemId),
    listFields(id),
  ]);

  if (!collection || !item || item.collection_id !== id) notFound();

  const normalizedFields = fields.map((f) => ({
    ...f,
    options: Array.isArray(f.options) ? f.options : [],
  })) as CmsField[];

  const normalizedItem = {
    ...(item as CmsItem),
    data:
      item.data && typeof item.data === "object" && !Array.isArray(item.data)
        ? (item.data as Record<string, unknown>)
        : {},
  };

  return (
    <>
      <EditorTopbar
        backHref={`/admin/collections/${id}`}
        backLabel={(collection as CmsCollection).name}
      />
      <ItemEditor
        collection={collection as CmsCollection}
        item={normalizedItem}
        fields={normalizedFields}
      />
    </>
  );
}
