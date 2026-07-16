---
title: Portfolio CMS - Product Requirements Document
project: Vivek Arya Portfolio CMS
stage: MVP
author: Product Development Pipeline (PM Agent)
version: 1.0.0
last_updated: 2026-07-15
---

# Portfolio CMS - Product Requirements Document

## 1. Problem Statement

Vivek's portfolio currently lives as a Webflow-exported static site (`arya-vivek.webflow.io`).
Content updates (adding a project, editing a case study, publishing a blog) require Webflow's
paid editor and lock the content, design, and hosting inside Webflow. The `blogs` navigation
link points to `#` because no blog exists yet.

**Goal:** Own the full stack. Ship a self-hosted Next.js + Supabase application with a
Webflow-style admin CMS that lets a single admin (Vivek) create, edit, publish, and unpublish
**Projects** (rich multi-section case studies), **Blog Posts**, and **Categories**, and a public
site that renders them and preserves existing URLs.

## 2. Personas

### Persona A - The Owner/Editor (primary)
- **Who:** Vivek, product designer, sole content editor and site owner.
- **Context:** Updates the site occasionally (a new case study every few weeks, a blog post
  monthly). Comfortable with design tools; wants a Webflow-like editing feel, not raw Markdown or a database GUI.
- **Needs:** Fast, visual editing; drag-drop images; draft before publish; preview; confidence
  that publishing won't break the live site.
- **Frustrations with status quo:** Webflow subscription cost, no ownership, no blog.

### Persona B - The Visitor/Recruiter (secondary)
- **Who:** Hiring managers, recruiters, potential clients.
- **Context:** Lands from LinkedIn/resume, scans works, reads 1-2 case studies, maybe a blog post.
- **Needs:** Fast load, clear case studies, mobile-friendly, working links.

### Persona C - The Reader (tertiary)
- **Who:** Peers/designers reading the blog.
- **Needs:** Readable long-form content, good typography, shareable URLs.

## 3. User Stories

### Owner/Editor (admin)
- US-001: As the owner, I can log in securely so only I can edit content.
- US-002: As the owner, I can create a Category with a name and slug.
- US-003: As the owner, I can create a Project with title, subtitle, company, category, live link, date, card image, gallery, and a rich multi-section body.
- US-004: As the owner, I can build a case-study body with headings, lists, images with captions, quotes, and embeds.
- US-005: As the owner, I can save a Project as a draft and publish it when ready.
- US-006: As the owner, I can unpublish or delete content.
- US-007: As the owner, I can mark a Project as "featured."
- US-008: As the owner, I can preview a draft before publishing.
- US-009: As the owner, I can create and publish Blog Posts using the same editor.
- US-010: As the owner, I can upload images by drag-and-drop and they are stored in my own storage.
- US-011: As the owner, I can search and sort my content lists.
- US-012: As the owner, I can duplicate an item to reuse structure.

### Visitor/Reader (public)
- US-020: As a visitor, I can browse all published projects on `/works`.
- US-021: As a visitor, I can read a full case study at `/projects/[slug]`.
- US-022: As a reader, I can browse the blog at `/blog` and read a post at `/blog/[slug]`.
- US-023: As a visitor, existing project URLs still work after migration.
- US-024: As a visitor, unpublished content is never visible to me.

## 4. Feature Prioritization (MoSCoW)

| Feature | Priority | Notes |
|---|---|---|
| Single-admin auth | MUST | Supabase email/password |
| Categories CRUD | MUST | Simplest collection, proves pattern |
| Projects CRUD + rich block editor | MUST | Core value |
| Image + gallery upload to own storage | MUST | Supabase Storage |
| Draft / Publish / Unpublish workflow | MUST | Prevents broken live site |
| Blog Posts CRUD | MUST | The missing feature |
| Public site (home, works, project, blog) | MUST | Renders content |
| Preserve existing project slugs | MUST | No broken links |
| Migration of 7 existing projects | MUST | Content continuity |
| Live preview of drafts | SHOULD | Confidence before publish |
| Featured toggle | SHOULD | Home/works emphasis |
| Search + sort in lists | SHOULD | Manageability |
| Duplicate item | COULD | Convenience |
| Tags on blog | COULD | Organization |
| Multi-user roles | WON'T (v1) | Single admin only |
| Ecommerce | WON'T | Out of scope |
| Analytics dashboard | WON'T (v1) | Later |

## 5. Success Metrics
- Owner can publish a new blog post end-to-end in under 10 minutes without touching code.
- Zero broken links for the 7 migrated project URLs.
- Public pages reach Largest Contentful Paint under 1.5s on 4G.
- Publishing an item makes it live within one revalidation cycle (<10s) with no manual redeploy.
- Unpublished/draft content is never reachable by an anonymous request (verified by RLS).

## 6. Competitive Scan
- **Webflow CMS** (current): visual, polished, but locked + paid. We mirror its collection/editor UX.
- **Sanity/Payload:** powerful headless editors; heavier setup than needed for one editor.
- **Contentful/Storyblok:** SaaS lock-in, cost.
- **Astro + Markdown:** cheapest, but file-based editing loses the visual/CMS feel the owner wants.
- **Our choice - Next.js + Supabase + Tiptap:** owned, free-tier friendly, Webflow-like editor feel, full control of design and hosting.

## 7. Assumptions & Open Questions
- Assumption: Single admin; no public sign-up.
- Assumption: Deployment on Vercel (confirm at public-site step).
- Open: Supabase project created by owner; keys provided via env (local dev possible first).
