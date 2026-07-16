"use server";

import { createClient } from "@/lib/supabase/server";
import { estimateReadingTime } from "@/lib/format";
import { slugify, uniqueSlug } from "@/lib/slug";
import { docToPlainText } from "@/lib/tiptap-text";
import type { JSONContent } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ActionResult = { ok: boolean; error?: string; id?: string; slug?: string };

async function takenPostSlugs(ignoreId?: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select("id, slug");
  return (data ?? [])
    .filter((p) => p.id !== ignoreId)
    .map((p) => p.slug as string);
}

export type PostInput = {
  id: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  body: JSONContent | null;
  tags: string[];
};

function revalidatePost(slug: string) {
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
}

export async function savePost(input: PostInput): Promise<ActionResult> {
  const supabase = await createClient();
  const title = input.title.trim() || "Untitled post";
  const slug = uniqueSlug(slugify(title), await takenPostSlugs(input.id));
  const reading_time = estimateReadingTime(docToPlainText(input.body));

  const { data, error } = await supabase
    .from("posts")
    .update({
      title,
      slug,
      excerpt: input.excerpt,
      cover_image_url: input.cover_image_url,
      body: input.body,
      tags: input.tags,
      reading_time,
    })
    .eq("id", input.id)
    .select("slug, status")
    .single();

  if (error) return { ok: false, error: error.message };
  if (data.status === "published") revalidatePost(data.slug);
  return { ok: true, id: input.id, slug: data.slug };
}

export async function publishPost(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", id)
    .select("slug")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePost(data.slug);
  return { ok: true, slug: data.slug };
}

export async function unpublishPost(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .update({ status: "draft" })
    .eq("id", id)
    .select("slug")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePost(data.slug);
  return { ok: true, slug: data.slug };
}

export async function deletePost(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("slug")
    .eq("id", id)
    .single();
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  if (data?.slug) revalidatePost(data.slug);
  return { ok: true };
}

export async function createPostAndEdit() {
  const supabase = await createClient();
  const slug = uniqueSlug(slugify("Untitled post"), await takenPostSlugs());
  const { data, error } = await supabase
    .from("posts")
    .insert({ title: "Untitled post", slug, status: "draft" })
    .select("id")
    .single();
  if (error) return;
  redirect(`/admin/blog/${data.id}`);
}
