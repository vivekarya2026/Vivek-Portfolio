"use server";

import { createClient } from "@/lib/supabase/server";
import { slugify, uniqueSlug } from "@/lib/slug";
import type { CmsFieldType, JSONContent, Status } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ActionResult = { ok: boolean; error?: string; id?: string };

async function takenCollectionSlugs(ignoreId?: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("cms_collections").select("id, slug");
  return (data ?? [])
    .filter((c) => c.id !== ignoreId)
    .map((c) => c.slug as string);
}

async function takenFieldSlugs(collectionId: string, ignoreId?: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cms_fields")
    .select("id, slug")
    .eq("collection_id", collectionId);
  return (data ?? [])
    .filter((f) => f.id !== ignoreId)
    .map((f) => f.slug as string);
}

async function takenItemSlugs(collectionId: string, ignoreId?: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cms_items")
    .select("id, slug")
    .eq("collection_id", collectionId);
  return (data ?? [])
    .filter((i) => i.id !== ignoreId)
    .map((i) => i.slug as string);
}

function revalidateCollection(id: string) {
  revalidatePath("/admin/collections");
  revalidatePath(`/admin/collections/${id}`);
  revalidatePath(`/admin/collections/${id}/schema`);
}

export async function createCollectionAndEdit() {
  const supabase = await createClient();
  const name = "Untitled Collection";
  const slug = uniqueSlug(slugify(name), await takenCollectionSlugs());
  const { data, error } = await supabase
    .from("cms_collections")
    .insert({ name, slug, singular_name: "Item" })
    .select("id")
    .single();
  if (error || !data) return;
  revalidatePath("/admin/collections");
  redirect(`/admin/collections/${data.id}/schema`);
}

export async function saveCollection(input: {
  id: string;
  name: string;
  singular_name: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const name = input.name.trim() || "Untitled Collection";
  const singular_name = input.singular_name.trim() || "Item";
  const slug = uniqueSlug(
    slugify(name),
    await takenCollectionSlugs(input.id),
  );
  const { error } = await supabase
    .from("cms_collections")
    .update({ name, slug, singular_name })
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidateCollection(input.id);
  return { ok: true, id: input.id };
}

export async function deleteCollection(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("cms_collections").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/collections");
  return { ok: true };
}

export async function addField(input: {
  collection_id: string;
  name: string;
  field_type: CmsFieldType;
  required?: boolean;
  options?: string[];
}): Promise<ActionResult> {
  const supabase = await createClient();
  const name = input.name.trim() || "New field";
  const slug = uniqueSlug(
    slugify(name),
    await takenFieldSlugs(input.collection_id),
  );

  const { data: maxRow } = await supabase
    .from("cms_fields")
    .select("sort_order")
    .eq("collection_id", input.collection_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sort_order = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("cms_fields")
    .insert({
      collection_id: input.collection_id,
      name,
      slug,
      field_type: input.field_type,
      required: input.required ?? false,
      options: input.options ?? [],
      sort_order,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidateCollection(input.collection_id);
  return { ok: true, id: data.id };
}

export async function updateField(input: {
  id: string;
  collection_id: string;
  name: string;
  required: boolean;
  options?: string[];
}): Promise<ActionResult> {
  const supabase = await createClient();
  const name = input.name.trim() || "Field";
  const slug = uniqueSlug(
    slugify(name),
    await takenFieldSlugs(input.collection_id, input.id),
  );
  const { error } = await supabase
    .from("cms_fields")
    .update({
      name,
      slug,
      required: input.required,
      options: input.options ?? [],
    })
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidateCollection(input.collection_id);
  return { ok: true, id: input.id };
}

export async function deleteField(
  id: string,
  collectionId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("cms_fields").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateCollection(collectionId);
  return { ok: true };
}

export async function reorderFields(
  collectionId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const supabase = await createClient();
  const updates = orderedIds.map((id, index) =>
    supabase.from("cms_fields").update({ sort_order: index }).eq("id", id),
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, error: failed.error.message };
  revalidateCollection(collectionId);
  return { ok: true };
}

export async function createItemAndEdit(collectionId: string) {
  const supabase = await createClient();
  const name = "Untitled item";
  const slug = uniqueSlug(
    slugify(name),
    await takenItemSlugs(collectionId),
  );
  const { data, error } = await supabase
    .from("cms_items")
    .insert({
      collection_id: collectionId,
      name,
      slug,
      status: "draft",
      data: {},
    })
    .select("id")
    .single();
  if (error || !data) return;
  revalidateCollection(collectionId);
  redirect(`/admin/collections/${collectionId}/items/${data.id}`);
}

export async function saveItem(input: {
  id: string;
  collection_id: string;
  name: string;
  data: Record<string, unknown>;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const name = input.name.trim() || "Untitled item";
  const slug = uniqueSlug(
    slugify(name),
    await takenItemSlugs(input.collection_id, input.id),
  );
  const { error } = await supabase
    .from("cms_items")
    .update({ name, slug, data: input.data })
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidateCollection(input.collection_id);
  revalidatePath(`/admin/collections/${input.collection_id}/items/${input.id}`);
  return { ok: true, id: input.id };
}

export async function setItemStatus(
  id: string,
  collectionId: string,
  status: Status,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("cms_items")
    .update({
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateCollection(collectionId);
  revalidatePath(`/admin/collections/${collectionId}/items/${id}`);
  return { ok: true };
}

export async function deleteItem(
  id: string,
  collectionId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("cms_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateCollection(collectionId);
  return { ok: true };
}

/** Keep TypeScript happy for richtext payloads stored in jsonb. */
export type RichValue = JSONContent | null;
