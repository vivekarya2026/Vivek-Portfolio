"use server";

import {
  listProjectIdsSlugs,
  createProject,
  updateProject,
  deleteProject as deleteProjectDoc,
  getProjectById,
} from "@/lib/data/projects";
import { slugify, uniqueSlug } from "@/lib/slug";
import { triggerSiteDeploy } from "@/lib/trigger-site-deploy";
import type { JSONContent } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ActionResult = { ok: boolean; error?: string; id?: string; slug?: string };

async function takenProjectSlugs(ignoreId?: string): Promise<string[]> {
  const rows = await listProjectIdsSlugs();
  return rows.filter((p) => p.id !== ignoreId).map((p) => p.slug);
}

export type ProjectInput = {
  id: string;
  title: string;
  subtitle: string | null;
  company_name: string | null;
  category_id: string | null;
  live_link: string | null;
  project_date: string | null;
  card_image_url: string | null;
  gallery: string[];
  body: JSONContent | null;
  featured: boolean;
};

function revalidateProject(slug: string) {
  revalidatePath("/works");
  revalidatePath("/");
  revalidatePath(`/projects/${slug}`);
}

export async function saveProject(input: ProjectInput): Promise<ActionResult> {
  const title = input.title.trim() || "Untitled project";
  const base = slugify(title);
  const slug = uniqueSlug(base, await takenProjectSlugs(input.id), undefined);

  try {
    const updated = await updateProject(input.id, {
      title,
      slug,
      subtitle: input.subtitle,
      company_name: input.company_name,
      category_id: input.category_id,
      live_link: input.live_link,
      project_date: input.project_date || null,
      card_image_url: input.card_image_url,
      gallery: input.gallery,
      body: input.body,
      featured: input.featured,
    });
    if (updated.status === "published") {
      revalidateProject(updated.slug);
      await triggerSiteDeploy(`save-project:${updated.slug}`);
    }
    return { ok: true, id: input.id, slug: updated.slug };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function publishProject(id: string): Promise<ActionResult> {
  try {
    const updated = await updateProject(id, {
      status: "published",
      published_at: new Date().toISOString(),
    });
    revalidateProject(updated.slug);
    await triggerSiteDeploy(`publish:${updated.slug}`);
    return { ok: true, slug: updated.slug };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function unpublishProject(id: string): Promise<ActionResult> {
  try {
    const updated = await updateProject(id, { status: "draft" });
    revalidateProject(updated.slug);
    await triggerSiteDeploy(`unpublish:${updated.slug}`);
    return { ok: true, slug: updated.slug };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  try {
    const existing = await getProjectById(id);
    await deleteProjectDoc(id);
    if (existing?.slug) revalidateProject(existing.slug);
    if (existing?.status === "published") {
      await triggerSiteDeploy(`delete:${existing.slug}`);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function createProjectAndEdit() {
  const slug = uniqueSlug(slugify("Untitled project"), await takenProjectSlugs());
  try {
    const created = await createProject({
      title: "Untitled project",
      slug,
      status: "draft",
      gallery: [],
      featured: false,
      sort_order: 0,
    });
    redirect(`/admin/projects/${created.id}`);
  } catch (err) {
    console.error("createProjectAndEdit failed:", err);
  }
}

export async function reorderProjects(ids: string[]): Promise<ActionResult> {
  try {
    await Promise.all(
      ids.map((id, index) => updateProject(id, { sort_order: index })),
    );
    revalidatePath("/admin/projects");
    revalidatePath("/works");
    revalidatePath("/");
    await triggerSiteDeploy("reorder-projects");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function duplicateProject(id: string): Promise<ActionResult> {
  try {
    const src = await getProjectById(id);
    if (!src) return { ok: false, error: "Couldn't read source." };
    const slug = uniqueSlug(
      slugify(`${src.title} copy`),
      await takenProjectSlugs(),
    );
    const created = await createProject({
      title: `${src.title} (copy)`,
      slug,
      subtitle: src.subtitle,
      company_name: src.company_name,
      category_id: src.category_id,
      live_link: src.live_link,
      project_date: src.project_date,
      card_image_url: src.card_image_url,
      gallery: src.gallery,
      body: src.body,
      featured: false,
      status: "draft",
      sort_order: 0,
    });
    return { ok: true, id: created.id };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
