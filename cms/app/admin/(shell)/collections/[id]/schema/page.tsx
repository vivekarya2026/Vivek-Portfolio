import { EditorTopbar } from "@/components/admin/editor-chrome";
import {
  getCollectionById,
  listFields,
} from "@/lib/data/collections";
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
  const collection = await getCollectionById(id);
  if (!collection) notFound();

  const fields = await listFields(id);
  const normalized = fields.map((f) => ({
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
