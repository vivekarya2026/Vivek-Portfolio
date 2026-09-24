"use server";

import {
  listPostIdsSlugs,
  createPost,
  updatePost,
  deletePost as deletePostDoc,
  getPostById,
} from "@/lib/data/posts";
import { estimateReadingTime } from "@/lib/format";
import { slugify, uniqueSlug } from "@/lib/slug";
import { docToPlainText } from "@/lib/tiptap-text";
import type { JSONContent } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ActionResult = { ok: boolean; error?: string; id?: string; slug?: string };

async function takenPostSlugs(ignoreId?: string): Promise<string[]> {
  const rows = await listPostIdsSlugs();
  return rows.filter((p) => p.id !== ignoreId).map((p) => p.slug);
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
  const title = input.title.trim() || "Untitled post";
  const slug = uniqueSlug(slugify(title), await takenPostSlugs(input.id));
  const reading_time = estimateReadingTime(docToPlainText(input.body));

  try {
    const updated = await updatePost(input.id, {
      title,
      slug,
      excerpt: input.excerpt,
      cover_image_url: input.cover_image_url,
      body: input.body,
      tags: input.tags,
      reading_time,
    });
    if (updated.status === "published") revalidatePost(updated.slug);
    return { ok: true, id: input.id, slug: updated.slug };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function publishPost(id: string): Promise<ActionResult> {
  try {
    const updated = await updatePost(id, {
      status: "published",
      published_at: new Date().toISOString(),
    });
    revalidatePost(updated.slug);
    return { ok: true, slug: updated.slug };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function unpublishPost(id: string): Promise<ActionResult> {
  try {
    const updated = await updatePost(id, { status: "draft" });
    revalidatePost(updated.slug);
    return { ok: true, slug: updated.slug };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deletePost(id: string): Promise<ActionResult> {
  try {
    const existing = await getPostById(id);
    await deletePostDoc(id);
    if (existing?.slug) revalidatePost(existing.slug);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function createPostAndEdit() {
  const slug = uniqueSlug(slugify("Untitled post"), await takenPostSlugs());
  try {
    const created = await createPost({
      title: "Untitled post",
      slug,
      status: "draft",
      tags: [],
    });
    redirect(`/admin/blog/${created.id}`);
  } catch (err) {
    console.error("createPostAndEdit failed:", err);
  }
}
