/**
 * One-time migration: import the existing Webflow-exported project pages into
 * Supabase (projects table), converting the .w-richtext body into Tiptap JSON,
 * downloading Webflow CDN images into Supabase Storage, and preserving slugs so
 * existing /projects/<slug> URLs keep working.
 *
 * Usage:
 *   1. Fill cms/.env.local with real Supabase URL + SERVICE ROLE key.
 *   2. npm run migrate:webflow
 *
 * Idempotent: upserts by slug. Re-running updates existing rows.
 */
import { createClient } from "@supabase/supabase-js";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { parse, type HTMLElement } from "node-html-parser";

// Static portfolio lives at ../site (sibling of cms/). Override with WEBFLOW_EXPORT_DIR if needed.
const EXPORT_DIR =
  process.env.WEBFLOW_EXPORT_DIR ?? join(process.cwd(), "..", "site");
const PROJECTS_DIR = join(EXPORT_DIR, "projects");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (
  !SUPABASE_URL ||
  !SERVICE_KEY ||
  SUPABASE_URL.includes("placeholder") ||
  SERVICE_KEY.includes("placeholder")
) {
  console.error(
    "Missing real Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function text(el: HTMLElement | null): string {
  return el?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

// ── Download a remote image into Supabase Storage, return the public URL ──
const uploadedCache = new Map<string, string>();

async function mirrorImage(src: string): Promise<string | null> {
  if (!src) return null;
  if (uploadedCache.has(src)) return uploadedCache.get(src)!;
  if (!/^https?:\/\//.test(src)) return src;

  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    const extFromUrl = src.split("?")[0].split(".").pop()?.toLowerCase();
    const ext = extFromUrl && extFromUrl.length <= 4 ? extFromUrl : "jpg";
    const path = `migrated/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("media")
      .upload(path, buf, { contentType, upsert: false });
    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from("media").getPublicUrl(path);
    uploadedCache.set(src, publicUrl);
    return publicUrl;
  } catch (err) {
    console.warn(`  ! image failed (${src}):`, (err as Error).message);
    return src; // fall back to original CDN URL
  }
}

// ── Convert a .w-richtext element into Tiptap JSON ──
async function richTextToTiptap(root: HTMLElement): Promise<TiptapNode> {
  const content: TiptapNode[] = [];

  for (const child of root.childNodes) {
    if (child.nodeType !== 1) continue;
    const el = child as HTMLElement;
    const tag = el.tagName?.toLowerCase();

    if (!tag) continue;

    if (/^h[1-6]$/.test(tag)) {
      const level = Math.min(Math.max(Number(tag[1]), 2), 4);
      content.push({
        type: "heading",
        attrs: { level },
        content: inline(el),
      });
    } else if (tag === "p") {
      const inl = inline(el);
      if (inl.length) content.push({ type: "paragraph", content: inl });
      else content.push({ type: "paragraph" });
    } else if (tag === "ul" || tag === "ol") {
      content.push({
        type: tag === "ul" ? "bulletList" : "orderedList",
        content: el
          .querySelectorAll("li")
          .map((li) => ({
            type: "listItem",
            content: [{ type: "paragraph", content: inline(li) }],
          })),
      });
    } else if (tag === "figure" || tag === "img") {
      const img =
        tag === "img" ? el : (el.querySelector("img") as HTMLElement | null);
      if (img) {
        const src = img.getAttribute("src") ?? "";
        const mirrored = await mirrorImage(src);
        const caption = text(el.querySelector("figcaption"));
        content.push({
          type: "image",
          attrs: {
            src: mirrored ?? src,
            alt: img.getAttribute("alt") ?? "",
            title: caption || null,
          },
        });
      }
    } else if (tag === "blockquote") {
      content.push({ type: "blockquote", content: [{ type: "paragraph", content: inline(el) }] });
    } else if (tag === "hr") {
      content.push({ type: "horizontalRule" });
    } else {
      // Fallback: treat unknown block (e.g. embed) as a paragraph of its text.
      const t = text(el);
      if (t) content.push({ type: "paragraph", content: [{ type: "text", text: t }] });
    }
  }

  if (content.length === 0) content.push({ type: "paragraph" });
  return { type: "doc", content };
}

// ── Inline text + marks (bold, italic, links) ──
function inline(el: HTMLElement): TiptapNode[] {
  const out: TiptapNode[] = [];

  const walk = (node: HTMLElement, marks: TiptapNode["marks"] = []) => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        const raw = child.textContent ?? "";
        const t = raw.replace(/\u200d/g, "").replace(/\s+/g, " ");
        if (t.trim() === "" && t !== " ") continue;
        if (t) out.push({ type: "text", text: t, ...(marks.length ? { marks } : {}) });
        continue;
      }
      if (child.nodeType !== 1) continue;
      const c = child as HTMLElement;
      const tag = c.tagName?.toLowerCase();
      if (tag === "br") {
        out.push({ type: "hardBreak" });
      } else if (tag === "strong" || tag === "b") {
        walk(c, [...marks, { type: "bold" }]);
      } else if (tag === "em" || tag === "i") {
        walk(c, [...marks, { type: "italic" }]);
      } else if (tag === "a") {
        const href = c.getAttribute("href") ?? "#";
        walk(c, [...marks, { type: "link", attrs: { href } }]);
      } else {
        walk(c, marks);
      }
    }
  };

  walk(el);
  // Trim empty edges
  return out.filter((n) => !(n.type === "text" && n.text?.trim() === ""));
}

// ── Ensure a category exists, return its id ──
const categoryCache = new Map<string, string>();

async function ensureCategory(name: string): Promise<string | null> {
  if (!name) return null;
  if (categoryCache.has(name)) return categoryCache.get(name)!;

  const slug = slugify(name);
  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    categoryCache.set(name, existing.id);
    return existing.id;
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({ name, slug, published: true })
    .select("id")
    .single();
  if (error) {
    console.warn(`  ! category "${name}" failed:`, error.message);
    return null;
  }
  categoryCache.set(name, data.id);
  return data.id;
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function migrateFile(file: string) {
  const slug = file.replace(/\.html$/, "");
  const html = await readFile(join(PROJECTS_DIR, file), "utf8");
  const root = parse(html);

  const title = text(root.querySelector(".heading-style-h1, h1")) || slug;
  const subtitle = text(root.querySelector(".work-body_descript p"));

  const details = root.querySelectorAll(".work-body_details .text-style-allcaps");
  const category = details[0] ? text(details[0]) : "";
  const dateRaw = details[1] ? text(details[1]) : "";

  // Live link (first hyperlink in details that isn't "View live project" label anchor)
  const liveEl = root.querySelector(".work-body_details a.hyperlink");
  const liveHref = liveEl?.getAttribute("href");
  const liveLink = liveHref && liveHref !== "#" ? liveHref : null;

  const richtext = root.querySelector(
    ".rich-text-block.w-richtext, .rich-text-block.vp-richtext, .w-richtext, .vp-richtext",
  );
  const body = richtext ? await richTextToTiptap(richtext) : { type: "doc", content: [{ type: "paragraph" }] };

  // Card image: try the og:image or first image in the richtext / hero.
  const ogImage = root
    .querySelector('meta[property="og:image"]')
    ?.getAttribute("content");
  const firstImg = richtext?.querySelector("img")?.getAttribute("src");
  const cardSrc = ogImage || firstImg || "";
  const card_image_url = cardSrc ? await mirrorImage(cardSrc) : null;

  const category_id = await ensureCategory(category);

  const row = {
    title,
    slug,
    subtitle: subtitle || null,
    company_name: null as string | null,
    category_id,
    live_link: liveLink,
    project_date: parseDate(dateRaw),
    card_image_url,
    gallery: [],
    body,
    featured: false,
    status: "published" as const,
    published_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("projects")
    .upsert(row, { onConflict: "slug" });

  if (error) {
    console.error(`  ✗ ${slug}:`, error.message);
  } else {
    console.log(`  ✓ ${slug} — "${title}" (${category || "no category"})`);
  }
}

async function main() {
  console.log(`Reading projects from: ${PROJECTS_DIR}\n`);
  const files = (await readdir(PROJECTS_DIR)).filter((f) => f.endsWith(".html"));
  console.log(`Found ${files.length} project page(s).\n`);

  for (const file of files) {
    console.log(`→ ${file}`);
    await migrateFile(file);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
