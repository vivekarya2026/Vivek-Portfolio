import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/admin";
import { createSessionClient } from "@/lib/appwrite/server";
import { APPWRITE_DATABASE_ID, COLLECTION } from "@/lib/appwrite/config";
import { mapMeta, parseJson, toJsonString, fetchAll } from "./helpers";
import type { Post } from "@/lib/types";

const DB = APPWRITE_DATABASE_ID;
const COL = COLLECTION.POSTS;

function mapPost(doc: Record<string, unknown>): Post {
  return {
    ...mapMeta(doc as Parameters<typeof mapMeta>[0]),
    title: doc.title as string,
    slug: doc.slug as string,
    excerpt: (doc.excerpt as string | null) ?? null,
    cover_image_url: (doc.cover_image_url as string | null) ?? null,
    body: parseJson(doc.body, null),
    tags: parseJson<string[]>(doc.tags, []),
    reading_time: (doc.reading_time as number | null) ?? null,
    status: (doc.status as "draft" | "published") ?? "draft",
    published_at: (doc.published_at as string | null) ?? null,
  };
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function listPosts(): Promise<Post[]> {
  const { databases } = createAdminClient();
  const docs = await fetchAll((cursor) =>
    databases.listDocuments(DB, COL, [
      Query.orderDesc("$createdAt"),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
      Query.limit(100),
    ]),
  );
  return docs.map(mapPost as (doc: Record<string, unknown>) => Post);
}

export async function getPostById(id: string): Promise<Post | null> {
  try {
    const { databases } = createAdminClient();
    const doc = await databases.getDocument(DB, COL, id);
    return mapPost(doc as unknown as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function listPostIdsSlugs(): Promise<{ id: string; slug: string }[]> {
  const { databases } = createAdminClient();
  const docs = await fetchAll((cursor) =>
    databases.listDocuments(DB, COL, [
      Query.select(["$id", "slug"]),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
      Query.limit(100),
    ]),
  );
  return docs.map((d) => ({ id: d.$id, slug: d.slug as string }));
}

// ── Write ────────────────────────────────────────────────────────────────────

type PostWriteData = {
  title?: string;
  slug?: string;
  excerpt?: string | null;
  cover_image_url?: string | null;
  body?: unknown;
  tags?: string[];
  reading_time?: number | null;
  status?: string;
  published_at?: string | null;
};

function serializePost(data: PostWriteData) {
  return {
    ...data,
    body: data.body !== undefined ? toJsonString(data.body) : undefined,
    tags: data.tags !== undefined ? toJsonString(data.tags) : undefined,
  };
}

export async function createPost(data: PostWriteData): Promise<Post> {
  const { databases } = await createSessionClient();
  const doc = await databases.createDocument(DB, COL, "unique()", serializePost(data));
  return mapPost(doc as unknown as Record<string, unknown>);
}

export async function updatePost(id: string, data: PostWriteData): Promise<Post> {
  const { databases } = await createSessionClient();
  const payload = serializePost(data);
  const clean = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined),
  );
  const doc = await databases.updateDocument(DB, COL, id, clean);
  return mapPost(doc as unknown as Record<string, unknown>);
}

export async function deletePost(id: string): Promise<void> {
  const { databases } = await createSessionClient();
  await databases.deleteDocument(DB, COL, id);
}
