import { EditorTopbar } from "@/components/admin/editor-chrome";
import { createClient } from "@/lib/supabase/server";
import type { CmsCollection, CmsField } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SchemaEditor } from "./schema-editor";

export const dynamic = "force-dynamic";

export default async function CollectionSchemaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: collection } = await supabase
    .from("cms_collections")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!collection) notFound();

  const { data: fields } = await supabase
    .from("cms_fields")
    .select("*")
    .eq("collection_id", id)
    .order("sort_order", { ascending: true });

  const normalized = (fields ?? []).map((f) => ({
    ...f,
    options: Array.isArray(f.options) ? f.options : [],
  })) as CmsField[];

  return (
    <>
      <EditorTopbar
        backHref={`/admin/collections/${id}`}
        backLabel="Items"
      >
        <Link
          href={`/admin/collections/${id}`}
          className="text-sm text-ink-muted hover:text-ink"
        >
          View items
        </Link>
      </EditorTopbar>
      <SchemaEditor
        collection={collection as CmsCollection}
        fields={normalized}
      />
    </>
  );
}
