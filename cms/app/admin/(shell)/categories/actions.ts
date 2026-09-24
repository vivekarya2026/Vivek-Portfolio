"use server";

import {
  listCategoryIdsSlugs,
  createCategory,
  updateCategory,
  deleteCategory as deleteCategoryDoc,
  countProjectsByCategory,
} from "@/lib/data/categories";
import { slugify, uniqueSlug } from "@/lib/slug";
import { triggerSiteDeploy } from "@/lib/trigger-site-deploy";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ActionResult = { ok: boolean; error?: string; id?: string };

async function takenCategorySlugs(ignoreId?: string): Promise<string[]> {
  const rows = await listCategoryIdsSlugs();
  return rows.filter((c) => c.id !== ignoreId).map((c) => c.slug);
}

export async function saveCategory(formData: FormData): Promise<ActionResult> {
  const id = (formData.get("id") as string) || undefined;
  const name = String(formData.get("name") ?? "").trim();
  const published = formData.get("published") === "on";

  if (!name) return { ok: false, error: "Name is required." };

  const base = slugify(name);
  const slug = uniqueSlug(base, await takenCategorySlugs(id));

  try {
    if (id) {
      await updateCategory(id, { name, slug, published });
      revalidatePath("/works");
      await triggerSiteDeploy(`category:${slug}`);
      return { ok: true, id };
    }

    const created = await createCategory({ name, slug, published });
    revalidatePath("/works");
    return { ok: true, id: created.id };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    const count = await countProjectsByCategory(id);
    if (count > 0) {
      return {
        ok: false,
        error: `This category is used by ${count} project(s). Reassign them first.`,
      };
    }
    await deleteCategoryDoc(id);
    revalidatePath("/works");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function createCategoryAndEdit() {
  const result = await saveCategoryQuick("Untitled category");
  if (result.id) redirect(`/admin/categories/${result.id}`);
}

async function saveCategoryQuick(name: string): Promise<ActionResult> {
  const slug = uniqueSlug(slugify(name), await takenCategorySlugs());
  try {
    const created = await createCategory({ name, slug, published: false });
    return { ok: true, id: created.id };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
