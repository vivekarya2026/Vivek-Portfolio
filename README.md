# Vivek Portfolio

Monorepo separating the **admin CMS** from the **public portfolio site**.

```
Vivek-Portfolio/
  cms/     Next.js admin portal + API (Supabase, Resend)
  site/    Static portfolio HTML (Webflow-origin design)
  docs/    Product / design / architecture docs
```

## Quick start

### CMS (admin)

```bash
cd cms
npm install
npm run dev
```

Open <http://localhost:3000/admin>

### Public site

```bash
npx serve -l 8080 site
```

Open <http://localhost:8080>

## Sync CMS → site

From `cms/`:

```bash
npm run build:site
```

Regenerates `site/works.html`, `site/index.html` featured list, and `site/projects/<slug>.html` from published Supabase projects.

## Contact form

`site/contact.html` posts to `cms` at `/api/contact`. Requires:

1. Run `cms/supabase/migrations/0004_contact_submissions.sql` in Supabase
2. Set `RESEND_API_KEY` + `ADMIN_EMAIL` in `cms/.env.local`

See [cms/README.md](cms/README.md) for full setup.

## Deploy (Vercel) + auto-sync

CMS publishes regenerate the public site automatically:

**CMS publish → Supabase → Vercel Deploy Hook → `build:site:ci` → live HTML**

Full steps: [docs/03-architecture/vercel-deployment.md](docs/03-architecture/vercel-deployment.md).
