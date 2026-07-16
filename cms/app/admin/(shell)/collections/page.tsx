import {
  CollectionHeader,
  EmptyState,
} from "@/components/admin/collection-chrome";
import { createClient } from "@/lib/supabase/server";
import type { CmsCollection } from "@/lib/types";
import { CollectionsList } from "./collections-list";
import { NewCollectionButton } from "./new-collection-button";

export const metadata = { title: "Custom Collections - Portfolio CMS" };
export const dynamic = "force-dynamic";

function isMissingTable(message: string | undefined) {
  if (!message) return false;
  return (
    message.includes("cms_collections") &&
    (message.includes("schema cache") ||
      message.includes("does not exist") ||
      message.includes("Could not find the table"))
  );
}

export default async function CollectionsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cms_collections")
    .select("*")
    .order("created_at", { ascending: false });

  if (error && isMissingTable(error.message)) {
    return (
      <>
        <CollectionHeader title="Custom Collections">
          <NewCollectionButton />
        </CollectionHeader>
        <EmptyState
          title="Setup required"
          description="Run supabase/migrations/0005_custom_collections.sql in the Supabase SQL Editor (that file only). Then refresh this page."
        />
      </>
    );
  }

  if (error) {
    return (
      <>
        <CollectionHeader title="Custom Collections" />
        <EmptyState
          title="Couldn't load collections"
          description={error.message}
        />
      </>
    );
  }

  const collections = (data ?? []) as CmsCollection[];

  return (
    <>
      <CollectionHeader title="Custom Collections" count={collections.length}>
        <NewCollectionButton />
      </CollectionHeader>
      {collections.length === 0 ? (
        <EmptyState
          title="No custom collections yet"
          description="Create a collection, define its fields, then add items — all from the admin portal. These stay admin-only (not on the public site yet)."
          action={<NewCollectionButton />}
        />
      ) : (
        <CollectionsList collections={collections} />
      )}
    </>
  );
}
