import { EditorTopbar } from "@/components/admin/editor-chrome";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();

  const [{ data: collection }, { data: item }, { data: fields }] =
    await Promise.all([
      supabase.from("cms_collections").select("*").eq("id", id).maybeSingle(),
      supabase.from("cms_items").select("*").eq("id", itemId).maybeSingle(),
      supabase
        .from("cms_fields")
        .select("*")
        .eq("collection_id", id)
        .order("sort_order", { ascending: true }),
    ]);

  if (!collection || !item || item.collection_id !== id) notFound();

  const normalizedFields = (fields ?? []).map((f) => ({
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
