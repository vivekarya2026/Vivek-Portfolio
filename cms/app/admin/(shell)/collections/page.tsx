import {
  CollectionHeader,
  EmptyState,
} from "@/components/admin/collection-chrome";
import { listCollections } from "@/lib/data/collections";
import type { CmsCollection } from "@/lib/types";
import { CollectionsList } from "./collections-list";
import { NewCollectionButton } from "./new-collection-button";

export const metadata = { title: "Custom Collections - Portfolio CMS" };
export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  let collections: CmsCollection[] = [];
  let errorMsg: string | null = null;

  try {
    collections = await listCollections();
  } catch (err) {
    errorMsg = (err as Error).message;
    console.error("collections list failed:", errorMsg);
  }

  if (errorMsg) {
    return (
      <>
        <CollectionHeader title="Custom Collections" />
        <EmptyState title="Couldn't load collections" description={errorMsg} />
      </>
    );
  }

  return (
    <>
      <CollectionHeader title="Custom Collections" count={collections.length}>
        <NewCollectionButton />
      </CollectionHeader>
      {collections.length === 0 ? (
        <EmptyState
          title="No custom collections yet"
          description="Create a collection, define its fields, then add items — all from the admin portal."
          action={<NewCollectionButton />}
        />
      ) : (
        <CollectionsList collections={collections} />
      )}
    </>
  );
}
