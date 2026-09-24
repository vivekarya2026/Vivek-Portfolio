#!/usr/bin/env tsx
/**
 * One-time data migration: Supabase → Appwrite
 *
 * Reads every table from Supabase (using the service-role client) and writes
 * each document into Appwrite (using the API key client). Media files are
 * re-uploaded to Appwrite Storage, and any stored Supabase public URLs are
 * rewritten to the new Appwrite view URLs.
 *
 * Prerequisites:
 *   1. Run appwrite-setup.ts first (collections must exist).
 *   2. Set ALL of the following env vars in .env.local:
 *        NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (source)
 *        NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY,   (destination)
 *        APPWRITE_DATABASE_ID, APPWRITE_BUCKET_ID
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/migrate-supabase-to-appwrite.ts
 *
 * Safe to re-run: uses the Supabase row id as the Appwrite $id where allowed
 * (IDs are kept ≤36 chars); if a document already exists it is updated.
 */

import { createClient as createSupabase } from "@supabase/supabase-js";
import {
  Client,
  Databases,
  Storage,
  ID,
  Query,
} from "node-appwrite";

// ── Environment ──────────────────────────────────────────────────────────────

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const AW_ENDPOINT =
  process.env.APPWRITE_ENDPOINT ?? "https://cloud.appwrite.io/v1";
const AW_PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const AW_KEY = process.env.APPWRITE_API_KEY!;
const AW_DB = process.env.APPWRITE_DATABASE_ID ?? "portfolio-cms";
const AW_BUCKET = process.env.APPWRITE_BUCKET_ID ?? "media";

for (const [k, v] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: SB_URL,
  SUPABASE_SERVICE_ROLE_KEY: SB_KEY,
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: AW_PROJECT,
  APPWRITE_API_KEY: AW_KEY,
})) {
  if (!v) {
    console.error(`Missing env var: ${k}`);
    process.exit(1);
  }
}

// ── Clients ──────────────────────────────────────────────────────────────────

const sb = createSupabase(SB_URL, SB_KEY, { auth: { persistSession: false } });

const awClient = new Client()
  .setEndpoint(AW_ENDPOINT)
  .setProject(AW_PROJECT)
  .setKey(AW_KEY);

const db = new Databases(awClient);
const storage = new Storage(awClient);

// ── Helpers ──────────────────────────────────────────────────────────────────

function toJson(v: unknown): string {
  return JSON.stringify(v ?? null);
}

/** Appwrite document IDs must be ≤36 chars and alphanumeric/dash/underscore. */
function awId(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 36);
}

async function upsertDoc(
  collectionId: string,
  id: string,
  data: Record<string, unknown>,
) {
  const safeId = awId(id);
  // Remove undefined/null for required fields coming in as null from Supabase
  const clean = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined),
  );
  try {
    await db.createDocument(AW_DB, collectionId, safeId, clean);
  } catch (err: unknown) {
    const msg = (err as { message?: string })?.message ?? "";
    if (msg.includes("already exists") || msg.includes("409")) {
      await db.updateDocument(AW_DB, collectionId, safeId, clean);
    } else {
      throw err;
    }
  }
}

/** Download a file from a URL and return bytes. */
async function downloadFile(url: string): Promise<Uint8Array<ArrayBuffer>> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return new Uint8Array(await res.arrayBuffer() as ArrayBuffer);
}

/** Upload a Uint8Array to Appwrite Storage and return the public view URL. */
async function uploadToAppwrite(
  buffer: Uint8Array<ArrayBuffer>,
  fileName: string,
  mimeType: string,
): Promise<string> {
  const fileId = ID.unique();
  await storage.createFile(
    AW_BUCKET,
    fileId,
    new File([buffer], fileName, { type: mimeType }),
  );
  return `${AW_ENDPOINT}/storage/buckets/${AW_BUCKET}/files/${fileId}/view?project=${AW_PROJECT}`;
}

/** Re-upload a Supabase storage public URL to Appwrite and return new URL. */
const urlCache = new Map<string, string>();
async function migrateUrl(
  supabaseUrl: string | null | undefined,
  label: string,
): Promise<string | null> {
  if (!supabaseUrl) return null;
  if (urlCache.has(supabaseUrl)) return urlCache.get(supabaseUrl)!;

  // Only re-upload Supabase storage URLs; leave CDN/external URLs as-is.
  if (!supabaseUrl.includes("supabase.co/storage/v1/object/public")) {
    return supabaseUrl;
  }

  try {
    const ab = await (await fetch(supabaseUrl)).arrayBuffer();
    const data = new Uint8Array(ab as ArrayBuffer) as Uint8Array<ArrayBuffer>;
    const fileName =
      decodeURIComponent(supabaseUrl.split("/").pop() ?? "file.bin");
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "bin";
    const mime =
      ext === "pdf"
        ? "application/pdf"
        : ext === "jpg" || ext === "jpeg"
          ? "image/jpeg"
          : ext === "png"
            ? "image/png"
            : ext === "webp"
              ? "image/webp"
              : ext === "gif"
                ? "image/gif"
                : "application/octet-stream";

    const newUrl = await uploadToAppwrite(data, fileName, mime);
    urlCache.set(supabaseUrl, newUrl);
    console.log(`      ↑ ${label}: ${fileName} → Appwrite`);
    return newUrl;
  } catch (err) {
    console.warn(`      ⚠ ${label}: failed to re-upload ${supabaseUrl}: ${(err as Error).message}`);
    return supabaseUrl; // keep original on failure
  }
}

// ── Table migrations ──────────────────────────────────────────────────────────

async function migrateCategories() {
  console.log("\n[categories]");
  const { data, error } = await sb.from("categories").select("*");
  if (error) { console.warn("  ⚠ skip:", error.message); return; }
  for (const row of data ?? []) {
    await upsertDoc("categories", row.id, {
      name: row.name,
      slug: row.slug,
      published: row.published ?? true,
    });
    console.log(`  ✓ ${row.name}`);
  }
}

async function migrateProjects() {
  console.log("\n[projects]");
  const { data, error } = await sb.from("projects").select("*");
  if (error) { console.warn("  ⚠ skip:", error.message); return; }
  for (const row of data ?? []) {
    const cardImageUrl = await migrateUrl(row.card_image_url, "card_image");
    const gallery: string[] = [];
    const origGallery: string[] = Array.isArray(row.gallery) ? row.gallery : [];
    for (const gUrl of origGallery) {
      const migrated = await migrateUrl(gUrl, "gallery");
      gallery.push(migrated ?? gUrl);
    }
    await upsertDoc("projects", row.id, {
      title: row.title,
      slug: row.slug,
      subtitle: row.subtitle ?? null,
      company_name: row.company_name ?? null,
      category_id: row.category_id ?? null,
      live_link: row.live_link ?? null,
      project_date: row.project_date ?? null,
      card_image_url: cardImageUrl,
      gallery: toJson(gallery),
      body: toJson(row.body),
      featured: row.featured ?? false,
      sort_order: row.sort_order ?? 0,
      status: row.status ?? "draft",
      published_at: row.published_at ?? null,
    });
    console.log(`  ✓ ${row.slug} (${row.status})`);
  }
}

async function migratePosts() {
  console.log("\n[posts]");
  const { data, error } = await sb.from("posts").select("*");
  if (error) { console.warn("  ⚠ skip:", error.message); return; }
  for (const row of data ?? []) {
    const coverUrl = await migrateUrl(row.cover_image_url, "cover_image");
    await upsertDoc("posts", row.id, {
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt ?? null,
      cover_image_url: coverUrl,
      body: toJson(row.body),
      tags: toJson(Array.isArray(row.tags) ? row.tags : []),
      reading_time: row.reading_time ?? null,
      status: row.status ?? "draft",
      published_at: row.published_at ?? null,
    });
    console.log(`  ✓ ${row.slug}`);
  }
}

async function migrateSettings() {
  console.log("\n[settings]");
  const { data, error } = await sb.from("settings").select("*");
  if (error) { console.warn("  ⚠ skip:", error.message); return; }
  for (const row of data ?? []) {
    let value = row.value;
    if (row.key === "resume_url") {
      value = await migrateUrl(row.value, "resume") ?? row.value;
    }
    // Use key as document ID (matches appwrite-setup.ts)
    try {
      await db.createDocument(AW_DB, "settings", row.key, {
        key: row.key,
        value: value ?? null,
      });
      console.log(`  ✓ ${row.key}`);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "";
      if (msg.includes("already exists") || msg.includes("409")) {
        await db.updateDocument(AW_DB, "settings", row.key, {
          key: row.key,
          value: value ?? null,
        });
        console.log(`  · ${row.key} (updated)`);
      } else throw err;
    }
  }
}

async function migrateContactSubmissions() {
  console.log("\n[contact_submissions]");
  const { data, error } = await sb.from("contact_submissions").select("*");
  if (error) { console.warn("  ⚠ skip:", error.message); return; }
  for (const row of data ?? []) {
    await upsertDoc("contact_submissions", row.id, {
      first_name: row.first_name,
      last_name: row.last_name ?? "",
      email: row.email,
      message: row.message,
      status: row.status ?? "new",
      email_sent: row.email_sent ?? false,
      email_error: row.email_error ?? null,
      source: row.source ?? null,
    });
    console.log(`  ✓ ${row.email}`);
  }
}

async function migrateCmsCollections() {
  console.log("\n[cms_collections]");
  const { data, error } = await sb.from("cms_collections").select("*");
  if (error) { console.warn("  ⚠ skip:", error.message); return; }
  for (const row of data ?? []) {
    await upsertDoc("cms_collections", row.id, {
      name: row.name,
      slug: row.slug,
      singular_name: row.singular_name ?? "",
    });
    console.log(`  ✓ ${row.name}`);
  }
}

async function migrateCmsFields() {
  console.log("\n[cms_fields]");
  const { data, error } = await sb.from("cms_fields").select("*");
  if (error) { console.warn("  ⚠ skip:", error.message); return; }
  for (const row of data ?? []) {
    await upsertDoc("cms_fields", row.id, {
      collection_id: row.collection_id,
      name: row.name,
      slug: row.slug,
      field_type: row.field_type,
      required: row.required ?? false,
      options: toJson(Array.isArray(row.options) ? row.options : []),
      sort_order: row.sort_order ?? 0,
    });
    console.log(`  ✓ ${row.name}`);
  }
}

async function migrateCmsItems() {
  console.log("\n[cms_items]");
  const { data, error } = await sb.from("cms_items").select("*");
  if (error) { console.warn("  ⚠ skip:", error.message); return; }
  for (const row of data ?? []) {
    await upsertDoc("cms_items", row.id, {
      collection_id: row.collection_id,
      name: row.name,
      slug: row.slug,
      status: row.status ?? "draft",
      data: toJson(row.data ?? {}),
      published_at: row.published_at ?? null,
    });
    console.log(`  ✓ ${row.name}`);
  }
}

// ── Verify counts ─────────────────────────────────────────────────────────────

async function verifyCounts() {
  console.log("\n── Verification ────────────────────────────────────────────");
  const collections = [
    "categories",
    "projects",
    "posts",
    "settings",
    "contact_submissions",
    "cms_collections",
    "cms_fields",
    "cms_items",
  ];

  for (const col of collections) {
    // Supabase count
    const { count: sbCount } = await sb
      .from(col)
      .select("id", { count: "exact", head: true });

    // Appwrite count
    let awCount = 0;
    try {
      const res = await db.listDocuments(AW_DB, col, [Query.limit(1)]);
      awCount = res.total;
    } catch {
      awCount = -1;
    }

    const ok = sbCount === awCount;
    console.log(
      `  ${ok ? "✓" : "✗"} ${col.padEnd(25)} supabase:${sbCount ?? "?"} → appwrite:${awCount}`,
    );
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Starting Supabase → Appwrite data migration…\n");
  console.log(`  Source: ${SB_URL}`);
  console.log(`  Target: ${AW_ENDPOINT} / project=${AW_PROJECT}`);

  await migrateCategories();
  await migrateProjects();
  await migratePosts();
  await migrateSettings();
  await migrateContactSubmissions();
  await migrateCmsCollections();
  await migrateCmsFields();
  await migrateCmsItems();

  await verifyCounts();

  console.log("\n✅ Migration complete.");
  console.log("   Review counts above, then remove Supabase env vars and deps.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
