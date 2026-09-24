#!/usr/bin/env tsx
/**
 * Appwrite Database + Storage setup script.
 *
 * Creates:
 *   - Database: portfolio-cms
 *   - 8 Collections with attributes and indexes
 *   - Storage bucket: media
 *   - Single admin user (optional, set ADMIN_EMAIL + ADMIN_PASSWORD env vars)
 *
 * Run once from the cms/ directory:
 *   npx tsx --env-file=.env.local scripts/appwrite-setup.ts
 *
 * Safe to re-run: uses try/catch to skip already-existing resources.
 */

import {
  Client,
  Databases,
  Storage,
  Users,
  Permission,
  Role,
  DatabasesIndexType,
} from "node-appwrite";

const IndexType = DatabasesIndexType;

const ENDPOINT =
  process.env.APPWRITE_ENDPOINT ?? "https://cloud.appwrite.io/v1";
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const API_KEY = process.env.APPWRITE_API_KEY!;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID ?? "portfolio-cms";
const BUCKET_ID = process.env.APPWRITE_BUCKET_ID ?? "media";

if (!PROJECT_ID || !API_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_APPWRITE_PROJECT_ID or APPWRITE_API_KEY in .env.local",
  );
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const db = new Databases(client);
const storage = new Storage(client);
const users = new Users(client);

// ── Helpers ──────────────────────────────────────────────────────────────────

async function tryCreate<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    const result = await fn();
    console.log(`  ✓ ${label}`);
    return result;
  } catch (err: unknown) {
    const msg = (err as { message?: string })?.message ?? String(err);
    // 409 = already exists
    if (msg.includes("already exists") || msg.includes("409")) {
      console.log(`  · ${label} (already exists)`);
      return null;
    }
    throw err;
  }
}

// Appwrite attribute creation is async — we must wait for each one to reach
// "available" status before creating an index that references it.
async function waitForAttributes(collectionId: string, keys: string[]) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const { attributes } = await db.getCollection(DATABASE_ID, collectionId);
    const ready = attributes.filter(
      (a: Record<string, unknown>) => keys.includes(a["key"] as string) && a["status"] === "available",
    );
    if (ready.length === keys.length) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.warn(`  ⚠ Timed out waiting for attributes on ${collectionId}`);
}

// ── Database ─────────────────────────────────────────────────────────────────

async function setupDatabase() {
  await tryCreate(`Database: ${DATABASE_ID}`, () =>
    db.create(DATABASE_ID, "Portfolio CMS"),
  );
}

// ── Collections ──────────────────────────────────────────────────────────────

// Public read, authenticated write
const publicPerms = [
  Permission.read(Role.any()),
  Permission.create(Role.users()),
  Permission.update(Role.users()),
  Permission.delete(Role.users()),
];

// Authenticated only (no public read)
const privatePerms = [
  Permission.read(Role.users()),
  Permission.create(Role.users()),
  Permission.update(Role.users()),
  Permission.delete(Role.users()),
];

async function setupCategories() {
  const id = "categories";
  await tryCreate(`Collection: ${id}`, () =>
    db.createCollection(DATABASE_ID, id, "Categories", publicPerms),
  );
  await tryCreate("attr: categories.name", () =>
    db.createStringAttribute(DATABASE_ID, id, "name", 255, true),
  );
  await tryCreate("attr: categories.slug", () =>
    db.createStringAttribute(DATABASE_ID, id, "slug", 255, true),
  );
  await tryCreate("attr: categories.published", () =>
    db.createBooleanAttribute(DATABASE_ID, id, "published", true, true),
  );
  await waitForAttributes(id, ["slug", "published"]);
  await tryCreate("idx: categories_slug", () =>
    db.createIndex(DATABASE_ID, id, "categories_slug", IndexType.Unique, ["slug"]),
  );
}

async function setupProjects() {
  const id = "projects";
  await tryCreate(`Collection: ${id}`, () =>
    db.createCollection(DATABASE_ID, id, "Projects", publicPerms),
  );
  await tryCreate("attr: projects.title", () =>
    db.createStringAttribute(DATABASE_ID, id, "title", 500, true),
  );
  await tryCreate("attr: projects.slug", () =>
    db.createStringAttribute(DATABASE_ID, id, "slug", 255, true),
  );
  await tryCreate("attr: projects.subtitle", () =>
    db.createStringAttribute(DATABASE_ID, id, "subtitle", 500, false),
  );
  await tryCreate("attr: projects.company_name", () =>
    db.createStringAttribute(DATABASE_ID, id, "company_name", 255, false),
  );
  await tryCreate("attr: projects.category_id", () =>
    db.createStringAttribute(DATABASE_ID, id, "category_id", 36, false),
  );
  await tryCreate("attr: projects.live_link", () =>
    db.createStringAttribute(DATABASE_ID, id, "live_link", 2048, false),
  );
  await tryCreate("attr: projects.project_date", () =>
    db.createStringAttribute(DATABASE_ID, id, "project_date", 10, false),
  );
  await tryCreate("attr: projects.card_image_url", () =>
    db.createStringAttribute(DATABASE_ID, id, "card_image_url", 2048, false),
  );
  // gallery stored as JSON string (array of URLs)
  await tryCreate("attr: projects.gallery", () =>
    db.createStringAttribute(DATABASE_ID, id, "gallery", 65535, false),
  );
  // body is Tiptap JSONContent — store as large string
  await tryCreate("attr: projects.body", () =>
    db.createStringAttribute(DATABASE_ID, id, "body", 1000000, false),
  );
  await tryCreate("attr: projects.featured", () =>
    db.createBooleanAttribute(DATABASE_ID, id, "featured", true, false),
  );
  await tryCreate("attr: projects.sort_order", () =>
    db.createIntegerAttribute(DATABASE_ID, id, "sort_order", false, 0, 0, 100000),
  );
  await tryCreate("attr: projects.status", () =>
    db.createEnumAttribute(DATABASE_ID, id, "status", ["draft", "published"], true, "draft"),
  );
  await tryCreate("attr: projects.published_at", () =>
    db.createStringAttribute(DATABASE_ID, id, "published_at", 30, false),
  );
  await waitForAttributes(id, ["slug", "status", "sort_order", "featured", "category_id"]);
  await tryCreate("idx: projects_slug", () =>
    db.createIndex(DATABASE_ID, id, "projects_slug", IndexType.Unique, ["slug"]),
  );
  await tryCreate("idx: projects_status", () =>
    db.createIndex(DATABASE_ID, id, "projects_status", IndexType.Key, ["status"]),
  );
  await tryCreate("idx: projects_sort", () =>
    db.createIndex(DATABASE_ID, id, "projects_sort", IndexType.Key, ["sort_order"]),
  );
  await tryCreate("idx: projects_category", () =>
    db.createIndex(DATABASE_ID, id, "projects_category", IndexType.Key, ["category_id"]),
  );
  await tryCreate("idx: projects_featured", () =>
    db.createIndex(DATABASE_ID, id, "projects_featured", IndexType.Key, ["featured"]),
  );
}

async function setupPosts() {
  const id = "posts";
  await tryCreate(`Collection: ${id}`, () =>
    db.createCollection(DATABASE_ID, id, "Blog Posts", publicPerms),
  );
  await tryCreate("attr: posts.title", () =>
    db.createStringAttribute(DATABASE_ID, id, "title", 500, true),
  );
  await tryCreate("attr: posts.slug", () =>
    db.createStringAttribute(DATABASE_ID, id, "slug", 255, true),
  );
  await tryCreate("attr: posts.excerpt", () =>
    db.createStringAttribute(DATABASE_ID, id, "excerpt", 1000, false),
  );
  await tryCreate("attr: posts.cover_image_url", () =>
    db.createStringAttribute(DATABASE_ID, id, "cover_image_url", 2048, false),
  );
  await tryCreate("attr: posts.body", () =>
    db.createStringAttribute(DATABASE_ID, id, "body", 1000000, false),
  );
  // tags stored as JSON string (array of strings)
  await tryCreate("attr: posts.tags", () =>
    db.createStringAttribute(DATABASE_ID, id, "tags", 4096, false),
  );
  await tryCreate("attr: posts.reading_time", () =>
    db.createIntegerAttribute(DATABASE_ID, id, "reading_time", false, undefined, 0, 9999),
  );
  await tryCreate("attr: posts.status", () =>
    db.createEnumAttribute(DATABASE_ID, id, "status", ["draft", "published"], true, "draft"),
  );
  await tryCreate("attr: posts.published_at", () =>
    db.createStringAttribute(DATABASE_ID, id, "published_at", 30, false),
  );
  await waitForAttributes(id, ["slug", "status"]);
  await tryCreate("idx: posts_slug", () =>
    db.createIndex(DATABASE_ID, id, "posts_slug", IndexType.Unique, ["slug"]),
  );
  await tryCreate("idx: posts_status", () =>
    db.createIndex(DATABASE_ID, id, "posts_status", IndexType.Key, ["status"]),
  );
}

async function setupSettings() {
  const id = "settings";
  await tryCreate(`Collection: ${id}`, () =>
    db.createCollection(DATABASE_ID, id, "Settings", privatePerms),
  );
  await tryCreate("attr: settings.key", () =>
    db.createStringAttribute(DATABASE_ID, id, "key", 255, true),
  );
  await tryCreate("attr: settings.value", () =>
    db.createStringAttribute(DATABASE_ID, id, "value", 2048, false),
  );
  await waitForAttributes(id, ["key"]);
  await tryCreate("idx: settings_key", () =>
    db.createIndex(DATABASE_ID, id, "settings_key", IndexType.Unique, ["key"]),
  );
}

async function setupContactSubmissions() {
  const id = "contact_submissions";
  await tryCreate(`Collection: ${id}`, () =>
    db.createCollection(DATABASE_ID, id, "Contact Submissions", privatePerms),
  );
  await tryCreate("attr: contact_submissions.first_name", () =>
    db.createStringAttribute(DATABASE_ID, id, "first_name", 100, true),
  );
  await tryCreate("attr: contact_submissions.last_name", () =>
    db.createStringAttribute(DATABASE_ID, id, "last_name", 100, false, ""),
  );
  await tryCreate("attr: contact_submissions.email", () =>
    db.createStringAttribute(DATABASE_ID, id, "email", 254, true),
  );
  await tryCreate("attr: contact_submissions.message", () =>
    db.createStringAttribute(DATABASE_ID, id, "message", 5000, true),
  );
  await tryCreate("attr: contact_submissions.status", () =>
    db.createEnumAttribute(DATABASE_ID, id, "status", ["new", "read", "archived"], true, "new"),
  );
  await tryCreate("attr: contact_submissions.email_sent", () =>
    db.createBooleanAttribute(DATABASE_ID, id, "email_sent", true, false),
  );
  await tryCreate("attr: contact_submissions.email_error", () =>
    db.createStringAttribute(DATABASE_ID, id, "email_error", 1000, false),
  );
  await tryCreate("attr: contact_submissions.source", () =>
    db.createStringAttribute(DATABASE_ID, id, "source", 255, false),
  );
  await waitForAttributes(id, ["email", "status"]);
  await tryCreate("idx: contact_email", () =>
    db.createIndex(DATABASE_ID, id, "contact_email", IndexType.Key, ["email"]),
  );
  await tryCreate("idx: contact_status", () =>
    db.createIndex(DATABASE_ID, id, "contact_status", IndexType.Key, ["status"]),
  );
}

async function setupCmsCollections() {
  const id = "cms_collections";
  await tryCreate(`Collection: ${id}`, () =>
    db.createCollection(DATABASE_ID, id, "CMS Collections", privatePerms),
  );
  await tryCreate("attr: cms_collections.name", () =>
    db.createStringAttribute(DATABASE_ID, id, "name", 255, true),
  );
  await tryCreate("attr: cms_collections.slug", () =>
    db.createStringAttribute(DATABASE_ID, id, "slug", 255, true),
  );
  await tryCreate("attr: cms_collections.singular_name", () =>
    db.createStringAttribute(DATABASE_ID, id, "singular_name", 255, false, ""),
  );
  await waitForAttributes(id, ["slug"]);
  await tryCreate("idx: cms_collections_slug", () =>
    db.createIndex(DATABASE_ID, id, "cms_collections_slug", IndexType.Unique, ["slug"]),
  );
}

async function setupCmsFields() {
  const id = "cms_fields";
  await tryCreate(`Collection: ${id}`, () =>
    db.createCollection(DATABASE_ID, id, "CMS Fields", privatePerms),
  );
  await tryCreate("attr: cms_fields.collection_id", () =>
    db.createStringAttribute(DATABASE_ID, id, "collection_id", 36, true),
  );
  await tryCreate("attr: cms_fields.name", () =>
    db.createStringAttribute(DATABASE_ID, id, "name", 255, true),
  );
  await tryCreate("attr: cms_fields.slug", () =>
    db.createStringAttribute(DATABASE_ID, id, "slug", 255, true),
  );
  await tryCreate("attr: cms_fields.field_type", () =>
    db.createEnumAttribute(DATABASE_ID, id, "field_type", [
      "text", "richtext", "image", "link", "email", "number", "date", "switch", "select",
    ], true),
  );
  await tryCreate("attr: cms_fields.required", () =>
    db.createBooleanAttribute(DATABASE_ID, id, "required", true, false),
  );
  // options is array of strings — store as JSON string
  await tryCreate("attr: cms_fields.options", () =>
    db.createStringAttribute(DATABASE_ID, id, "options", 4096, false, "[]"),
  );
  await tryCreate("attr: cms_fields.sort_order", () =>
    db.createIntegerAttribute(DATABASE_ID, id, "sort_order", false, 0, 0, 100000),
  );
  await waitForAttributes(id, ["collection_id", "slug"]);
  await tryCreate("idx: cms_fields_collection", () =>
    db.createIndex(DATABASE_ID, id, "cms_fields_collection", IndexType.Key, ["collection_id"]),
  );
  await tryCreate("idx: cms_fields_sort", () =>
    db.createIndex(DATABASE_ID, id, "cms_fields_sort", IndexType.Key, ["collection_id", "sort_order"]),
  );
}

async function setupCmsItems() {
  const id = "cms_items";
  await tryCreate(`Collection: ${id}`, () =>
    db.createCollection(DATABASE_ID, id, "CMS Items", privatePerms),
  );
  await tryCreate("attr: cms_items.collection_id", () =>
    db.createStringAttribute(DATABASE_ID, id, "collection_id", 36, true),
  );
  await tryCreate("attr: cms_items.name", () =>
    db.createStringAttribute(DATABASE_ID, id, "name", 255, true),
  );
  await tryCreate("attr: cms_items.slug", () =>
    db.createStringAttribute(DATABASE_ID, id, "slug", 255, true),
  );
  await tryCreate("attr: cms_items.status", () =>
    db.createEnumAttribute(DATABASE_ID, id, "status", ["draft", "published"], true, "draft"),
  );
  // data is a JSON object
  await tryCreate("attr: cms_items.data", () =>
    db.createStringAttribute(DATABASE_ID, id, "data", 65535, false, "{}"),
  );
  await tryCreate("attr: cms_items.published_at", () =>
    db.createStringAttribute(DATABASE_ID, id, "published_at", 30, false),
  );
  await waitForAttributes(id, ["collection_id", "status"]);
  await tryCreate("idx: cms_items_collection", () =>
    db.createIndex(DATABASE_ID, id, "cms_items_collection", IndexType.Key, ["collection_id"]),
  );
  await tryCreate("idx: cms_items_status", () =>
    db.createIndex(DATABASE_ID, id, "cms_items_status", IndexType.Key, ["status"]),
  );
}

// ── Storage ───────────────────────────────────────────────────────────────────

async function setupStorage() {
  await tryCreate(`Storage bucket: ${BUCKET_ID}`, () =>
    storage.createBucket(BUCKET_ID, "Media", [
      Permission.read(Role.any()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ], false, false, 8 * 1024 * 1024, [
      "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
      "application/pdf",
    ]),
  );
}

// ── Admin user ────────────────────────────────────────────────────────────────

async function setupAdminUser() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("  · Admin user skipped (set ADMIN_EMAIL + ADMIN_PASSWORD to create one)");
    return;
  }

  await tryCreate(`Admin user: ${email}`, async () => {
    const user = await users.create("admin", email, undefined, password, "Admin");
    await users.updateLabels(user.$id, ["admin"]);
    return user;
  });
}

// ── Seed settings ─────────────────────────────────────────────────────────────

async function seedSettings() {
  await tryCreate("Seed: settings.resume_url", () =>
    db.createDocument(DATABASE_ID, "settings", "resume_url", {
      key: "resume_url",
      value: null,
    }),
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Setting up Appwrite for Portfolio CMS…\n");

  console.log("Database:");
  await setupDatabase();

  console.log("\nCategories collection:");
  await setupCategories();

  console.log("\nProjects collection:");
  await setupProjects();

  console.log("\nPosts collection:");
  await setupPosts();

  console.log("\nSettings collection:");
  await setupSettings();

  console.log("\nContact Submissions collection:");
  await setupContactSubmissions();

  console.log("\nCMS Collections:");
  await setupCmsCollections();

  console.log("\nCMS Fields:");
  await setupCmsFields();

  console.log("\nCMS Items:");
  await setupCmsItems();

  console.log("\nStorage:");
  await setupStorage();

  console.log("\nAdmin user:");
  await setupAdminUser();

  console.log("\nSeeding:");
  await seedSettings();

  console.log("\n✅ Appwrite setup complete.\n");
  console.log("Next steps:");
  console.log("  1. Copy the IDs from the Appwrite console into .env.local");
  console.log("  2. Run the data migration: npx tsx --env-file=.env.local scripts/migrate-supabase-to-appwrite.ts");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
