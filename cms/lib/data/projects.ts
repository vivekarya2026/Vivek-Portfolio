import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/admin";
import { createSessionClient } from "@/lib/appwrite/server";
import { APPWRITE_DATABASE_ID, COLLECTION } from "@/lib/appwrite/config";
import { mapMeta, parseJson, toJsonString, fetchAll } from "./helpers";
import type { Project, ProjectWithCategory, Category } from "@/lib/types";

const DB = APPWRITE_DATABASE_ID;
const COL = COLLECTION.PROJECTS;
const CAT_COL = COLLECTION.CATEGORIES;

function mapProject(doc: Record<string, unknown>): Project {
  return {
    ...mapMeta(doc as Parameters<typeof mapMeta>[0]),
    title: doc.title as string,
    slug: doc.slug as string,
    subtitle: (doc.subtitle as string | null) ?? null,
    company_name: (doc.company_name as string | null) ?? null,
    category_id: (doc.category_id as string | null) ?? null,
    live_link: (doc.live_link as string | null) ?? null,
    project_date: (doc.project_date as string | null) ?? null,
    card_image_url: (doc.card_image_url as string | null) ?? null,
    gallery: parseJson<string[]>(doc.gallery, []),
    body: parseJson(doc.body, null),
    featured: (doc.featured as boolean | null) ?? false,
    sort_order: (doc.sort_order as number | null) ?? 0,
    status: (doc.status as "draft" | "published") ?? "draft",
    published_at: (doc.published_at as string | null) ?? null,
  };
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function listProjects(): Promise<ProjectWithCategory[]> {
  const { databases } = createAdminClient();

  const docs = await fetchAll((cursor) =>
    databases.listDocuments(DB, COL, [
      Query.orderAsc("sort_order"),
      Query.orderDesc("$createdAt"),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
      Query.limit(100),
    ]),
  );

  const projects = docs.map(mapProject as (doc: Record<string, unknown>) => Project);

  // Stitch category — fetch unique category IDs in one batch
  const categoryIds = [
    ...new Set(projects.map((p) => p.category_id).filter(Boolean) as string[]),
  ];

  let categoryMap: Map<string, Pick<Category, "id" | "name" | "slug">> = new Map();
  if (categoryIds.length > 0) {
    const catDocs = await databases.listDocuments(DB, CAT_COL, [
      Query.equal("$id", categoryIds),
      Query.limit(100),
    ]);
    categoryMap = new Map(
      catDocs.documents.map((d) => [
        d.$id,
        { id: d.$id, name: d.name as string, slug: d.slug as string },
      ]),
    );
  }

  return projects.map((p) => ({
    ...p,
    categories: p.category_id ? (categoryMap.get(p.category_id) ?? null) : null,
  }));
}

export async function listPublishedProjects(): Promise<
  (Project & { categories: { name: string } | null })[]
> {
  const { databases } = createAdminClient();
  const docs = await fetchAll((cursor) =>
    databases.listDocuments(DB, COL, [
      Query.equal("status", "published"),
      Query.orderAsc("sort_order"),
      Query.orderDesc("$createdAt"),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
      Query.limit(100),
    ]),
  );

  const projects = docs.map(mapProject as (doc: Record<string, unknown>) => Project);

  // Get unique category IDs
  const categoryIds = [
    ...new Set(projects.map((p) => p.category_id).filter(Boolean) as string[]),
  ];
  let categoryNameMap: Map<string, string> = new Map();
  if (categoryIds.length > 0) {
    const catDocs = await databases.listDocuments(DB, CAT_COL, [
      Query.equal("$id", categoryIds),
      Query.limit(100),
    ]);
    categoryNameMap = new Map(
      catDocs.documents.map((d) => [d.$id, d.name as string]),
    );
  }

  return projects.map((p) => ({
    ...p,
    categories: p.category_id
      ? { name: categoryNameMap.get(p.category_id) ?? "" }
      : null,
  }));
}

export async function getProjectById(id: string): Promise<Project | null> {
  try {
    const { databases } = createAdminClient();
    const doc = await databases.getDocument(DB, COL, id);
    return mapProject(doc as unknown as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function listProjectIdsSlugs(): Promise<{ id: string; slug: string }[]> {
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

type ProjectWriteData = {
  title: string;
  slug: string;
  subtitle?: string | null;
  company_name?: string | null;
  category_id?: string | null;
  live_link?: string | null;
  project_date?: string | null;
  card_image_url?: string | null;
  gallery?: string[];
  body?: unknown;
  featured?: boolean;
  sort_order?: number;
  status?: string;
  published_at?: string | null;
};

function serializeProject(data: ProjectWriteData) {
  return {
    ...data,
    gallery: data.gallery !== undefined ? toJsonString(data.gallery) : undefined,
    body: data.body !== undefined ? toJsonString(data.body) : undefined,
  };
}

export async function createProject(data: ProjectWriteData): Promise<Project> {
  const { databases } = await createSessionClient();
  const doc = await databases.createDocument(
    DB,
    COL,
    "unique()",
    serializeProject(data),
  );
  return mapProject(doc as unknown as Record<string, unknown>);
}

export async function updateProject(
  id: string,
  data: Partial<ProjectWriteData>,
): Promise<Project> {
  const { databases } = await createSessionClient();
  const payload = serializeProject(data as ProjectWriteData);
  // Remove undefined keys so Appwrite doesn't clear fields
  const clean = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined),
  );
  const doc = await databases.updateDocument(DB, COL, id, clean);
  return mapProject(doc as unknown as Record<string, unknown>);
}

export async function deleteProject(id: string): Promise<void> {
  const { databases } = await createSessionClient();
  await databases.deleteDocument(DB, COL, id);
}
