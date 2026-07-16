"use server";

import { createClient } from "@/lib/supabase/server";
import { slugify, uniqueSlug } from "@/lib/slug";
import { triggerSiteDeploy } from "@/lib/trigger-site-deploy";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ActionResult = { ok: boolean; error?: string; id?: string };

async function takenCategorySlugs(ignoreId?: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("id, slug");
  return (data ?? [])
    .filter((c) => c.id !== ignoreId)
    .map((c) => c.slug as string);
}

export async function saveCategory(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const id = (formData.get("id") as string) || undefined;
  const name = String(formData.get("name") ?? "").trim();
  const published = formData.get("published") === "on";

  if (!name) return { ok: false, error: "Name is required." };

  const base = slugify(name);
  const slug = uniqueSlug(base, await takenCategorySlugs(id));

  if (id) {
    const { error } = await supabase
      .from("categories")
      .update({ name, slug, published })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/works");
    // Category labels appear on published project cards.
    await triggerSiteDeploy(`category:${slug}`);
    return { ok: true, id };
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({ name, slug, published })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/works");
  return { ok: true, id: data.id };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Edge case: block deletion if projects reference this category.
  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `This category is used by ${count} project(s). Reassign them first.`,
    };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/works");
  return { ok: true };
}

export async function createCategoryAndEdit() {
  const result = await saveCategoryQuick("Untitled category");
  if (result.id) redirect(`/admin/categories/${result.id}`);
}

async function saveCategoryQuick(name: string): Promise<ActionResult> {
  const supabase = await createClient();
  const slug = uniqueSlug(slugify(name), await takenCategorySlugs());
  const { data, error } = await supabase
    .from("categories")
    .insert({ name, slug, published: false })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}
