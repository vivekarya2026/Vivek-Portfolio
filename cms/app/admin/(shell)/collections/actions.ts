"use server";

import {
  listCollectionIdsSlugs,
  listFieldIdsSlugs,
  listItemIdsSlugs,
  createCollection,
  updateCollection,
  deleteCollection as deleteCollectionDoc,
  createField,
  updateField as updateFieldDoc,
  deleteField as deleteFieldDoc,
  updateFieldSortOrder,
  getMaxSortOrder,
  createItem,
  updateItem,
  setItemStatus as setItemStatusDoc,
  deleteItem as deleteItemDoc,
} from "@/lib/data/collections";
import { slugify, uniqueSlug } from "@/lib/slug";
import type { CmsFieldType, Status } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ActionResult = { ok: boolean; error?: string; id?: string };

async function takenCollectionSlugs(ignoreId?: string): Promise<string[]> {
  const rows = await listCollectionIdsSlugs();
  return rows.filter((c) => c.id !== ignoreId).map((c) => c.slug);
}

async function takenFieldSlugs(
  collectionId: string,
  ignoreId?: string,
): Promise<string[]> {
  const rows = await listFieldIdsSlugs(collectionId);
  return rows.filter((f) => f.id !== ignoreId).map((f) => f.slug);
}

async function takenItemSlugs(
  collectionId: string,
  ignoreId?: string,
): Promise<string[]> {
  const rows = await listItemIdsSlugs(collectionId);
  return rows.filter((i) => i.id !== ignoreId).map((i) => i.slug);
}

function revalidateCollection(id: string) {
  revalidatePath("/admin/collections");
  revalidatePath(`/admin/collections/${id}`);
  revalidatePath(`/admin/collections/${id}/schema`);
}

export async function createCollectionAndEdit() {
  const name = "Untitled Collection";
  const slug = uniqueSlug(slugify(name), await takenCollectionSlugs());
  try {
    const created = await createCollection({ name, slug, singular_name: "Item" });
    revalidatePath("/admin/collections");
    redirect(`/admin/collections/${created.id}/schema`);
  } catch (err) {
    console.error("createCollectionAndEdit failed:", err);
  }
}

export async function saveCollection(input: {
  id: string;
  name: string;
  singular_name: string;
}): Promise<ActionResult> {
  const name = input.name.trim() || "Untitled Collection";
  const singular_name = input.singular_name.trim() || "Item";
  const slug = uniqueSlug(slugify(name), await takenCollectionSlugs(input.id));
  try {
    await updateCollection(input.id, { name, slug, singular_name });
    revalidateCollection(input.id);
    return { ok: true, id: input.id };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteCollection(id: string): Promise<ActionResult> {
  try {
    await deleteCollectionDoc(id);
    revalidatePath("/admin/collections");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function addField(input: {
  collection_id: string;
  name: string;
  field_type: CmsFieldType;
  required?: boolean;
  options?: string[];
}): Promise<ActionResult> {
  const name = input.name.trim() || "New field";
  const slug = uniqueSlug(slugify(name), await takenFieldSlugs(input.collection_id));
  const sort_order = (await getMaxSortOrder(input.collection_id)) + 1;
  try {
    const created = await createField({
      collection_id: input.collection_id,
      name,
      slug,
      field_type: input.field_type,
      required: input.required ?? false,
      options: input.options ?? [],
      sort_order,
    });
    revalidateCollection(input.collection_id);
    return { ok: true, id: created.id };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function updateField(input: {
  id: string;
  collection_id: string;
  name: string;
  required: boolean;
  options?: string[];
}): Promise<ActionResult> {
  const name = input.name.trim() || "Field";
  const slug = uniqueSlug(
    slugify(name),
    await takenFieldSlugs(input.collection_id, input.id),
  );
  try {
    await updateFieldDoc(input.id, {
      name,
      slug,
      required: input.required,
      options: input.options ?? [],
    });
    revalidateCollection(input.collection_id);
    return { ok: true, id: input.id };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteField(
  id: string,
  collectionId: string,
): Promise<ActionResult> {
  try {
    await deleteFieldDoc(id);
    revalidateCollection(collectionId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function reorderFields(
  collectionId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  try {
    await Promise.all(
      orderedIds.map((id, index) => updateFieldSortOrder(id, index)),
    );
    revalidateCollection(collectionId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function createItemAndEdit(collectionId: string) {
  const name = "Untitled item";
  const slug = uniqueSlug(slugify(name), await takenItemSlugs(collectionId));
  try {
    const created = await createItem({
      collection_id: collectionId,
      name,
      slug,
      status: "draft",
      data: {},
    });
    revalidateCollection(collectionId);
    redirect(`/admin/collections/${collectionId}/items/${created.id}`);
  } catch (err) {
    console.error("createItemAndEdit failed:", err);
  }
}

export async function saveItem(input: {
  id: string;
  collection_id: string;
  name: string;
  data: Record<string, unknown>;
}): Promise<ActionResult> {
  const name = input.name.trim() || "Untitled item";
  const slug = uniqueSlug(
    slugify(name),
    await takenItemSlugs(input.collection_id, input.id),
  );
  try {
    await updateItem(input.id, { name, slug, data: input.data });
    revalidateCollection(input.collection_id);
    revalidatePath(
      `/admin/collections/${input.collection_id}/items/${input.id}`,
    );
    return { ok: true, id: input.id };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function setItemStatus(
  id: string,
  collectionId: string,
  status: Status,
): Promise<ActionResult> {
  try {
    await setItemStatusDoc(id, status);
    revalidateCollection(collectionId);
    revalidatePath(`/admin/collections/${collectionId}/items/${id}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteItem(
  id: string,
  collectionId: string,
): Promise<ActionResult> {
  try {
    await deleteItemDoc(id);
    revalidateCollection(collectionId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** Keep TypeScript happy for richtext payloads stored in JSON. */
export type RichValue = import("@/lib/types").JSONContent | null;
