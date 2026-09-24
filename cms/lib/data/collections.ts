import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/admin";
import { createSessionClient } from "@/lib/appwrite/server";
import { APPWRITE_DATABASE_ID, COLLECTION } from "@/lib/appwrite/config";
import { mapMeta, parseJson, toJsonString, fetchAll } from "./helpers";
import type { CmsCollection, CmsField, CmsItem, CmsFieldType, Status } from "@/lib/types";

const DB = APPWRITE_DATABASE_ID;
const COL_C = COLLECTION.CMS_COLLECTIONS;
const COL_F = COLLECTION.CMS_FIELDS;
const COL_I = COLLECTION.CMS_ITEMS;

function mapCollection(doc: Record<string, unknown>): CmsCollection {
  return {
    ...mapMeta(doc as Parameters<typeof mapMeta>[0]),
    name: doc.name as string,
    slug: doc.slug as string,
    singular_name: (doc.singular_name as string) ?? "",
  };
}

function mapField(doc: Record<string, unknown>): CmsField {
  return {
    ...mapMeta(doc as Parameters<typeof mapMeta>[0]),
    collection_id: doc.collection_id as string,
    name: doc.name as string,
    slug: doc.slug as string,
    field_type: doc.field_type as CmsFieldType,
    required: (doc.required as boolean) ?? false,
    options: parseJson<string[]>(doc.options, []),
    sort_order: (doc.sort_order as number) ?? 0,
  };
}

function mapItem(doc: Record<string, unknown>): CmsItem {
  return {
    ...mapMeta(doc as Parameters<typeof mapMeta>[0]),
    collection_id: doc.collection_id as string,
    name: doc.name as string,
    slug: doc.slug as string,
    status: (doc.status as Status) ?? "draft",
    data: parseJson<Record<string, unknown>>(doc.data, {}),
    published_at: (doc.published_at as string | null) ?? null,
  };
}

// ── Collections ───────────────────────────────────────────────────────────────

export async function listCollections(): Promise<CmsCollection[]> {
  const { databases } = createAdminClient();
  const docs = await fetchAll((cursor) =>
    databases.listDocuments(DB, COL_C, [
      Query.orderDesc("$createdAt"),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
      Query.limit(100),
    ]),
  );
  return docs.map(mapCollection as (doc: Record<string, unknown>) => CmsCollection);
}

export async function getCollectionById(id: string): Promise<CmsCollection | null> {
  try {
    const { databases } = createAdminClient();
    const doc = await databases.getDocument(DB, COL_C, id);
    return mapCollection(doc as unknown as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function listCollectionIdsSlugs(): Promise<{ id: string; slug: string }[]> {
  const { databases } = createAdminClient();
  const docs = await fetchAll((cursor) =>
    databases.listDocuments(DB, COL_C, [
      Query.select(["$id", "slug"]),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
      Query.limit(100),
    ]),
  );
  return docs.map((d) => ({ id: d.$id, slug: d.slug as string }));
}

export async function createCollection(data: {
  name: string;
  slug: string;
  singular_name: string;
}): Promise<CmsCollection> {
  const { databases } = await createSessionClient();
  const doc = await databases.createDocument(DB, COL_C, "unique()", data);
  return mapCollection(doc as unknown as Record<string, unknown>);
}

export async function updateCollection(
  id: string,
  data: { name: string; slug: string; singular_name: string },
): Promise<void> {
  const { databases } = await createSessionClient();
  await databases.updateDocument(DB, COL_C, id, data);
}

export async function deleteCollection(id: string): Promise<void> {
  const { databases } = await createSessionClient();
  await databases.deleteDocument(DB, COL_C, id);
  // Child fields and items are deleted manually (no FK cascade in Appwrite)
  await deleteFieldsByCollection(id);
  await deleteItemsByCollection(id);
}

// ── Fields ────────────────────────────────────────────────────────────────────

export async function listFields(collectionId: string): Promise<CmsField[]> {
  const { databases } = createAdminClient();
  const docs = await fetchAll((cursor) =>
    databases.listDocuments(DB, COL_F, [
      Query.equal("collection_id", collectionId),
      Query.orderAsc("sort_order"),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
      Query.limit(100),
    ]),
  );
  return docs.map(mapField as (doc: Record<string, unknown>) => CmsField);
}

export async function listFieldIdsSlugs(
  collectionId: string,
): Promise<{ id: string; slug: string }[]> {
  const { databases } = createAdminClient();
  const docs = await fetchAll((cursor) =>
    databases.listDocuments(DB, COL_F, [
      Query.equal("collection_id", collectionId),
      Query.select(["$id", "slug"]),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
      Query.limit(100),
    ]),
  );
  return docs.map((d) => ({ id: d.$id, slug: d.slug as string }));
}

export async function getMaxSortOrder(collectionId: string): Promise<number> {
  const { databases } = createAdminClient();
  const res = await databases.listDocuments(DB, COL_F, [
    Query.equal("collection_id", collectionId),
    Query.orderDesc("sort_order"),
    Query.limit(1),
  ]);
  if (res.documents.length === 0) return -1;
  return (res.documents[0].sort_order as number) ?? -1;
}

export async function createField(data: {
  collection_id: string;
  name: string;
  slug: string;
  field_type: CmsFieldType;
  required: boolean;
  options: string[];
  sort_order: number;
}): Promise<CmsField> {
  const { databases } = await createSessionClient();
  const doc = await databases.createDocument(DB, COL_F, "unique()", {
    ...data,
    options: toJsonString(data.options),
  });
  return mapField(doc as unknown as Record<string, unknown>);
}

export async function updateField(
  id: string,
  data: { name: string; slug: string; required: boolean; options: string[] },
): Promise<void> {
  const { databases } = await createSessionClient();
  await databases.updateDocument(DB, COL_F, id, {
    ...data,
    options: toJsonString(data.options),
  });
}

export async function deleteField(id: string): Promise<void> {
  const { databases } = await createSessionClient();
  await databases.deleteDocument(DB, COL_F, id);
}

export async function updateFieldSortOrder(id: string, sort_order: number): Promise<void> {
  const { databases } = await createSessionClient();
  await databases.updateDocument(DB, COL_F, id, { sort_order });
}

async function deleteFieldsByCollection(collectionId: string): Promise<void> {
  const { databases } = createAdminClient();
  const docs = await fetchAll((cursor) =>
    databases.listDocuments(DB, COL_F, [
      Query.equal("collection_id", collectionId),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
      Query.limit(100),
    ]),
  );
  await Promise.all(
    docs.map((d) => databases.deleteDocument(DB, COL_F, d.$id)),
  );
}

// ── Items ─────────────────────────────────────────────────────────────────────

export async function listItems(collectionId: string): Promise<CmsItem[]> {
  const { databases } = createAdminClient();
  const docs = await fetchAll((cursor) =>
    databases.listDocuments(DB, COL_I, [
      Query.equal("collection_id", collectionId),
      Query.orderDesc("$createdAt"),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
      Query.limit(100),
    ]),
  );
  return docs.map(mapItem as (doc: Record<string, unknown>) => CmsItem);
}

export async function getItemById(id: string): Promise<CmsItem | null> {
  try {
    const { databases } = createAdminClient();
    const doc = await databases.getDocument(DB, COL_I, id);
    return mapItem(doc as unknown as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function listItemIdsSlugs(
  collectionId: string,
): Promise<{ id: string; slug: string }[]> {
  const { databases } = createAdminClient();
  const docs = await fetchAll((cursor) =>
    databases.listDocuments(DB, COL_I, [
      Query.equal("collection_id", collectionId),
      Query.select(["$id", "slug"]),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
      Query.limit(100),
    ]),
  );
  return docs.map((d) => ({ id: d.$id, slug: d.slug as string }));
}

export async function createItem(data: {
  collection_id: string;
  name: string;
  slug: string;
  status: Status;
  data: Record<string, unknown>;
}): Promise<CmsItem> {
  const { databases } = await createSessionClient();
  const doc = await databases.createDocument(DB, COL_I, "unique()", {
    ...data,
    data: toJsonString(data.data),
  });
  return mapItem(doc as unknown as Record<string, unknown>);
}

export async function updateItem(
  id: string,
  data: { name: string; slug: string; data: Record<string, unknown> },
): Promise<void> {
  const { databases } = await createSessionClient();
  await databases.updateDocument(DB, COL_I, id, {
    ...data,
    data: toJsonString(data.data),
  });
}

export async function setItemStatus(
  id: string,
  status: Status,
): Promise<void> {
  const { databases } = await createSessionClient();
  await databases.updateDocument(DB, COL_I, id, {
    status,
    published_at: status === "published" ? new Date().toISOString() : null,
  });
}

export async function deleteItem(id: string): Promise<void> {
  const { databases } = await createSessionClient();
  await databases.deleteDocument(DB, COL_I, id);
}

async function deleteItemsByCollection(collectionId: string): Promise<void> {
  const { databases } = createAdminClient();
  const docs = await fetchAll((cursor) =>
    databases.listDocuments(DB, COL_I, [
      Query.equal("collection_id", collectionId),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
      Query.limit(100),
    ]),
  );
  await Promise.all(
    docs.map((d) => databases.deleteDocument(DB, COL_I, d.$id)),
  );
}
