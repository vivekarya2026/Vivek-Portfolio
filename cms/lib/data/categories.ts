import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/admin";
import { createSessionClient } from "@/lib/appwrite/server";
import { APPWRITE_DATABASE_ID, COLLECTION } from "@/lib/appwrite/config";
import { mapMeta, parseJson, toJsonString, fetchAll } from "./helpers";
import type { Category } from "@/lib/types";

const DB = APPWRITE_DATABASE_ID;
const COL = COLLECTION.CATEGORIES;

function mapCategory(doc: Record<string, unknown>): Category {
  return {
    ...mapMeta(doc as Parameters<typeof mapMeta>[0]),
    name: doc.name as string,
    slug: doc.slug as string,
    published: doc.published as boolean,
  };
}

// ── Read (admin client for server-side full list) ──────────────────────────

export async function listCategories(): Promise<Category[]> {
  const { databases } = createAdminClient();
  const docs = await fetchAll((cursor) =>
    databases.listDocuments(DB, COL, [
      Query.orderDesc("$createdAt"),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
      Query.limit(100),
    ]),
  );
  return docs.map(mapCategory as (doc: Record<string, unknown>) => Category);
}

export async function getCategoryById(id: string): Promise<Category | null> {
  try {
    const { databases } = createAdminClient();
    const doc = await databases.getDocument(DB, COL, id);
    return mapCategory(doc as unknown as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function listCategoryIdsSlugs(): Promise<{ id: string; slug: string }[]> {
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

// ── Write (session client — requires logged-in admin) ─────────────────────

export async function createCategory(data: {
  name: string;
  slug: string;
  published: boolean;
}): Promise<Category> {
  const { databases } = await createSessionClient();
  const doc = await databases.createDocument(DB, COL, "unique()", data);
  return mapCategory(doc as unknown as Record<string, unknown>);
}

export async function updateCategory(
  id: string,
  data: { name: string; slug: string; published: boolean },
): Promise<void> {
  const { databases } = await createSessionClient();
  await databases.updateDocument(DB, COL, id, data);
}

export async function deleteCategory(id: string): Promise<void> {
  const { databases } = await createSessionClient();
  await databases.deleteDocument(DB, COL, id);
}

// Count projects referencing this category (use admin for cross-collection read)
export async function countProjectsByCategory(categoryId: string): Promise<number> {
  const { databases } = createAdminClient();
  const res = await databases.listDocuments(DB, COLLECTION.PROJECTS, [
    Query.equal("category_id", categoryId),
    Query.limit(1),
  ]);
  return res.total;
}

// Re-export helper for type annotation
export { mapCategory, parseJson, toJsonString };
