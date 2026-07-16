# Vivek Arya Portfolio CMS

A self-owned **content management system** for the portfolio, built with **Next.js (App Router) + Supabase + Tiptap**. It provides a Webflow-style admin panel to manage **Projects** (rich case studies), a **Blog**, and **Categories**.

The **public website stays the original Webflow design** (the static HTML export). Instead of serving the public site from Next.js, a generator script regenerates the original `works.html` and `projects/<slug>.html` files from the CMS — so the design is byte-for-byte the Webflow one, and you edit content in the CMS.

```
CMS (Next.js /admin)  ──edit──►  Supabase  ──build:site──►  original Webflow HTML files
```

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions) + TypeScript — admin CMS only
- **Tailwind CSS v4** with OKLCH design tokens (admin UI)
- **Supabase** — Postgres, Auth (single admin), Storage (images + resume PDF)
- **Tiptap v2** — block-based rich editor; body stored as JSON
- **node-html-parser** — powers the migration + static-site generator scripts

### Tooling

- **Node ≥ 20** — pinned via `"engines"` in `package.json` and `.nvmrc` (run `nvm use`).
- **ESLint** (flat config, `eslint.config.mjs`: next/core-web-vitals + typescript) — `npm run lint`.
- **Prettier** (`.prettierrc`) — `npm run format`.
- **Type checking** — `npm run typecheck` (`tsc --noEmit`).
- **Auth gating** lives in `middleware.ts` (matches `/admin/:path*`, redirects
  unauthenticated visitors to `/admin/login` and refreshes the Supabase session).

## Project layout

```
app/
  page.tsx            # redirects / → /admin
  admin/
    login/            # sign in
    (shell)/          # auth-gated CMS: projects, blog, categories, settings (+ [id] editors)
  api/revalidate/     # on-demand revalidation hook (optional)
components/{ui,admin}/
lib/{supabase,types,slug,format,cn,tiptap-text}
middleware.ts         # auth gate for /admin/*
supabase/migrations/
  0001_init.sql       # categories, projects, posts, RLS, media bucket
  0002_sort_order.sql # projects.sort_order (drag-to-reorder)
  0003_settings.sql   # settings key/value table (resume_url) + RLS
scripts/
  migrate-webflow.ts  # one-time: Webflow export → Supabase
  build-site.ts       # Supabase → original HTML files (+ resume-link swap)
  dewebflow.ts        # one-time: strip the Webflow footprint from the export
```

The static public site lives in the sibling `../site/` folder (`index.html`,
`works.html`, `projects/*.html`). Self-hosted CSS/JS/fonts/favicons live in
`../site/assets/` (see **De-Webflow** below).

Repo root layout:

```
Vivek-Portfolio/
  cms/     ← this app (admin + API)
  site/    ← public portfolio HTML
  docs/    ← product / design docs
```

## Setup

### 1. Install

```bash
cd cms
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run the migrations in `supabase/migrations/` in order (once each):
   - `0001_init.sql` — `categories`, `projects`, `posts` tables, RLS policies, public `media` bucket.
   - `0002_sort_order.sql` — adds `projects.sort_order` for drag-to-reorder.
   - `0003_settings.sql` — adds the `settings` key/value table (seeds `resume_url`) for the Settings screen.
   - `0004_contact_submissions.sql` — stores contact-form inquiries for `/admin/inquiries`.
   - `0005_custom_collections.sql` — custom collections / fields / items (admin-only builder).
3. In **Authentication → Users**, add a single user (your email + password). No public sign-up.

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in your keys from **Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # server-only; used by the scripts
NEXT_PUBLIC_SITE_URL=http://localhost:3000
REVALIDATE_SECRET=some-long-random-string   # optional

# Contact form → your inbox (https://resend.com/api-keys)
RESEND_API_KEY=re_...
ADMIN_EMAIL=aryavivekiitbhu@gmail.com
CONTACT_FROM_EMAIL=Portfolio Contact <onboarding@resend.dev>
CONTACT_ALLOWED_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
```

### 4. Run the CMS

```bash
npm run dev
```

- Admin CMS: <http://localhost:3000/admin> (root `/` redirects here)

## Editing the website

1. Open the CMS at `/admin`, add / edit / delete / publish projects.
   - **Priority / ordering:** on the Projects list, drag rows by the handle (⠿) to
     set the order. Top of the list = shown first on the site. Order is saved
     automatically.
   - **Featured:** toggle *Featured* in the project editor. Featured projects (in
     priority order) are what appear in the home page (`index.html`) highlight list.
   - **Delete:** delete from the project/post editor (Delete button) or straight from
     the list row.
   - **Categories:** project category tags under `/admin/categories`.
   - **Custom Collections:** create your own collections, fields, and items under
     `/admin/collections` (admin-only in v1 — not rendered on the public site yet).
   - **Resume:** upload a new resume PDF under `/admin/settings` (see below).
2. Regenerate the public site from the CMS:

   ```bash
   npm run build:site
   ```

This rewrites `../site/index.html` (the home-page featured list),
`../site/works.html` (the project cards), and each
`../site/projects/<slug>.html` page, using the **original Webflow markup as the
template** — only the dynamic content (title, description, category, date, live link, and the
rich-text body) is swapped in. Navbar, footer, CSS, and scripts stay identical to Webflow.

- Only **published** projects are rendered.
- Cards and the home list follow the **priority order** set by drag-and-drop
  (`sort_order`), tie-broken by project date.
- Unpublished / deleted projects have their generated page removed automatically.
- The generator is **idempotent** — safe to run any time. It reads from `../site`
  (override with `WEBFLOW_EXPORT_DIR=/path npm run build:site`).

On Vercel, you usually **don’t** run this by hand in production: publishing in
`/admin` calls `SITE_DEPLOY_HOOK_URL`, which rebuilds the public site with
`build:site:ci`. See [../docs/03-architecture/vercel-deployment.md](../docs/03-architecture/vercel-deployment.md).

Locally (or without a deploy hook), still run `npm run build:site` then refresh
the static server.

## Custom Collections (admin-only)

1. Run `supabase/migrations/0005_custom_collections.sql` in the Supabase SQL editor
   (**only that file**).
2. Open `/admin/collections` → **New Collection**.
3. On the schema screen: set the name, then **Add field** (plain text, rich text, image,
   link, email, number, date, switch, option).
4. Open the collection → **New Item** to fill the dynamic form. Draft / publish / delete
   from the item editor.

Custom collections are **not** written to the public site in v1.

## Contact form → email + CMS inbox

The portfolio `../site/contact.html` form posts to the CMS at `/api/contact`.

1. Run `supabase/migrations/0004_contact_submissions.sql` in the Supabase SQL editor
   (**only that file** — do not re-run `0001_init.sql`).
2. Create a free [Resend](https://resend.com) API key and set `RESEND_API_KEY` in `.env.local`.
3. Confirm `ADMIN_EMAIL` is your inbox (`aryavivekiitbhu@gmail.com`).
4. Restart `npm run dev`.
5. Submit a test message from <http://localhost:8080/contact>.

Each submission:
- Emails you via Resend (Reply-To = the visitor’s address)
- Appears under **Inquiries** at `/admin/inquiries`

Until you verify a custom domain in Resend, keep
`CONTACT_FROM_EMAIL=Portfolio Contact <onboarding@resend.dev>` — Resend only delivers
that sender to your own account email. After you verify a domain, switch the from-address
to something like `hello@yourdomain.com`.

For production, add your live portfolio origin to `CONTACT_ALLOWED_ORIGINS` and point
`data-contact-api` on the form (in `contact.html`) at your deployed CMS
`https://your-cms.vercel.app/api/contact`.

## Update your resume

The "Resume" button in the navbar (all pages) plus the body CTA on `about.html`/`works.html`
all resolve to a single CMS-managed URL, so you never edit HTML to swap your resume.

1. Go to `/admin/settings`.
2. Upload a new **PDF** (≤ 8 MB). It is stored in the `media` bucket under `resume/<uuid>.pdf`
   and the public URL is saved to `settings.resume_url`.
3. Run `npm run build:site`. Every legacy Webflow resume link is rewritten to your new URL
   across `index.html`, `works.html`, each `projects/<slug>.html`, plus `about.html` and
   `contact.html` (which are otherwise not regenerated). If no resume is set yet, the swap is a
   safe no-op and the original links are left untouched.

> Requires the `settings` table — run `supabase/migrations/0003_settings.sql` once.

## De-Webflow (self-hosted, no Webflow branding)

The static export is de-Webflowed by `scripts/dewebflow.ts` (idempotent, `*.dewf.bak`
backups) for **branding and hosting only** — the original interaction runtime is kept so
scroll reveals, hover-text, and card animations stay identical:

- **Local `assets/` folder** — `site.css` (fonts under `assets/fonts/`), favicons, and
  `assets/vendor/` (jQuery + webflow.js chunks). No Webflow CDN for CSS/JS.
- **Branding stripped** — Webflow HTML comments, generator meta, badge style, `data-wf-*`
  attrs, "Made with ❤️ on webflow" credit, and `*.webflow.io` staging links.
- **Animations kept** — the self-hosted jQuery + webflow.js runtime (plus the `w-mod-js`
  bootstrap and IX2 styles) still drives interactions. Class names stay `w-*` because that
  runtime depends on them.
- **`build-site.ts`** writes `data-item-slug` (not `data-wf-item-slug`) and keeps emitting
  the original `w-*` markup so regenerations stay compatible.
- **Content images** (project photos, logos) may still load from the Webflow CDN by design;
  `next.config.ts` keeps `cdn.prod.website-files.com` whitelisted alongside `*.supabase.co`.

## Migrating the existing Webflow projects (one-time)

Imports the exported project pages into Supabase, converts each rich-text body into Tiptap
JSON, mirrors CDN images into Supabase Storage, and preserves slugs. The selector accepts both
`.w-richtext` and `.vp-richtext` markup.

```bash
npm run migrate:webflow
```

Idempotent (upserts by slug). Already run for the current 7 projects.

## Edge cases handled

- Slug collisions → auto-suffixed (`-2`, `-3`) with a DB unique constraint backstop.
- Deleting a category still used by projects → blocked with a clear message.
- Image uploads → client type/size guards (images only, ≤ 8MB) with error toasts.
- Regenerating is non-destructive to the Webflow design (a `works.html.bak`, `index.html.bak`,
  and `projects.bak/` backup are taken in the export folder before the first regeneration).

## Documentation

See `../project-documentation/` for the product requirements, design brief, and technical architecture.
