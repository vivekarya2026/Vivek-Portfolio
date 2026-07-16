"use server";

import { createClient } from "@/lib/supabase/server";
import { slugify, uniqueSlug } from "@/lib/slug";
import { triggerSiteDeploy } from "@/lib/trigger-site-deploy";
import type { JSONContent } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ActionResult = { ok: boolean; error?: string; id?: string; slug?: string };

async function takenProjectSlugs(ignoreId?: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("id, slug");
  return (data ?? [])
    .filter((p) => p.id !== ignoreId)
    .map((p) => p.slug as string);
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
  const supabase = await createClient();
  const title = input.title.trim() || "Untitled project";
  const base = slugify(title);
  const slug = uniqueSlug(base, await takenProjectSlugs(input.id), undefined);

  const { data, error } = await supabase
    .from("projects")
    .update({
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
    })
    .eq("id", input.id)
    .select("slug, status")
    .single();

  if (error) return { ok: false, error: error.message };
  // Only rebuild the public site if it's already published.
  if (data.status === "published") {
    revalidateProject(data.slug);
    await triggerSiteDeploy(`save-project:${data.slug}`);
  }
  return { ok: true, id: input.id, slug: data.slug };
}

export async function publishProject(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", id)
    .select("slug")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidateProject(data.slug);
  await triggerSiteDeploy(`publish:${data.slug}`);
  return { ok: true, slug: data.slug };
}

export async function unpublishProject(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update({ status: "draft" })
    .eq("id", id)
    .select("slug")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidateProject(data.slug);
  await triggerSiteDeploy(`unpublish:${data.slug}`);
  return { ok: true, slug: data.slug };
}

export async function deleteProject(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("slug, status")
    .eq("id", id)
    .single();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  if (data?.slug) revalidateProject(data.slug);
  if (data?.status === "published") {
    await triggerSiteDeploy(`delete:${data.slug}`);
  }
  return { ok: true };
}

export async function createProjectAndEdit() {
  const supabase = await createClient();
  const slug = uniqueSlug(slugify("Untitled project"), await takenProjectSlugs());
  const { data, error } = await supabase
    .from("projects")
    .insert({ title: "Untitled project", slug, status: "draft" })
    .select("id")
    .single();
  if (error) return;
  redirect(`/admin/projects/${data.id}`);
}

export async function reorderProjects(ids: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  // Persist the new priority: array index becomes sort_order.
  const results = await Promise.all(
    ids.map((id, index) =>
      supabase.from("projects").update({ sort_order: index }).eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, error: failed.error.message };
  revalidatePath("/admin/projects");
  revalidatePath("/works");
  revalidatePath("/");
  await triggerSiteDeploy("reorder-projects");
  return { ok: true };
}

export async function duplicateProject(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: src, error: readErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (readErr || !src) return { ok: false, error: "Couldn't read source." };

  const slug = uniqueSlug(
    slugify(`${src.title} copy`),
    await takenProjectSlugs(),
  );
  const { data, error } = await supabase
    .from("projects")
    .insert({
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
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}
