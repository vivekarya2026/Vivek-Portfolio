# Vercel deployment

Two Vercel projects from the same GitHub repo
[`vivekarya2026/Vivek-Portfolio`](https://github.com/vivekarya2026/Vivek-Portfolio).

## Architecture

```
CMS edit/publish ──► Supabase
                         │
                         ▼  triggerSiteDeploy()
              ┌──────────┴──────────┐
              ▼                     ▼
   SITE_DEPLOY_HOOK_URL    GITHUB_REBUILD_TOKEN
   (Vercel Deploy Hook)    (repository_dispatch
                            → rebuild-site.yml)
                         │
                         ▼
                   Vercel rebuilds public site
                   (`npm run build:site:ci` reads Supabase)
                         │
                         ▼
                   Live HTML on portfolio domain
```

This repo uses **Option B** (GitHub Actions) because the site project may not have Git connected yet. Either path regenerates `site/` from published Supabase rows.

## Project 1 — Public portfolio

| Setting | Value |
|--------|--------|
| Name | `vivek-portfolio` (or your brand) |
| Framework Preset | Other |
| Root Directory | `.` (repository root) |
| Uses | root `vercel.json` |

That config runs `cms`’s `build:site:ci` and publishes the `site/` folder with clean URLs (`/about`, `/works`, …).

### Env vars (Site project)

Needed at **build** time so HTML is generated from Supabase:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL` = CMS production URL (e.g. `https://vivek-portfolio-cms.vercel.app`)
- `CONTACT_API_URL` = `https://<cms-host>/api/contact` (optional if `NEXT_PUBLIC_SITE_URL` is set)

### Deploy Hook (required for auto-sync)

1. Site project → **Settings → Git → Deploy Hooks**
2. Create hook named `cms-publish`
3. Copy the URL into the **CMS** project as `SITE_DEPLOY_HOOK_URL`

## Project 2 — CMS (admin + API)

| Setting | Value |
|--------|--------|
| Name | `vivek-portfolio-cms` |
| Framework Preset | Next.js |
| Root Directory | `cms` |

### Env vars (CMS project)

Copy from `cms/.env.example`, plus:

- `SITE_DEPLOY_HOOK_URL` = Deploy Hook from Project 1
- `CONTACT_ALLOWED_ORIGINS` = `https://your-portfolio.vercel.app` (and custom domain)
- `NEXT_PUBLIC_SITE_URL` = this CMS’s own URL

## First-time setup (CLI)

```bash
# Install CLI once
npm i -g vercel

# From repo root — create/link the PUBLIC site project
vercel link          # create vivek-portfolio, root = .
vercel env add …     # add build env vars
vercel --prod

# CMS project
cd cms
vercel link          # create vivek-portfolio-cms, root = cms
vercel env add …     # add runtime env vars including SITE_DEPLOY_HOOK_URL
vercel --prod
```

Or import the repo twice in the [Vercel dashboard](https://vercel.com/new) with the Root Directory settings above.

## What triggers a site rebuild

| CMS action | Rebuilds public site? |
|-----------|------------------------|
| Publish / unpublish project | Yes |
| Save a published project | Yes |
| Delete a published project | Yes |
| Reorder projects | Yes |
| Update resume URL | Yes |
| Rename category | Yes |
| Draft-only edits | No |

Rebuilds usually finish in 1–2 minutes on Vercel.

## Local development

```bash
# Terminal 1 — CMS
cd cms && npm run dev

# Terminal 2 — static site
npx serve -l 8080 site

# After CMS content changes locally:
cd cms && npm run build:site
```
