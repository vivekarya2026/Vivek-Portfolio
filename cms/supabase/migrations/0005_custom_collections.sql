-- Portfolio CMS - custom (Webflow-style) collections
-- Run ONLY this file in the Supabase SQL editor (do not re-run 0001_init.sql).
-- Admin-only: create collections, define fields, fill items. No public site rendering in v1.

create table if not exists public.cms_collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  singular_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists cms_collections_updated_at on public.cms_collections;
create trigger cms_collections_updated_at
  before update on public.cms_collections
  for each row execute function public.set_updated_at();

create table if not exists public.cms_fields (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.cms_collections (id) on delete cascade,
  name text not null,
  slug text not null,
  field_type text not null check (
    field_type in (
      'text', 'richtext', 'image', 'link', 'email',
      'number', 'date', 'switch', 'select'
    )
  ),
  required boolean not null default false,
  options jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (collection_id, slug)
);

create index if not exists cms_fields_collection_idx
  on public.cms_fields (collection_id, sort_order);

create table if not exists public.cms_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.cms_collections (id) on delete cascade,
  name text not null,
  slug text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  data jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection_id, slug)
);

create index if not exists cms_items_collection_idx
  on public.cms_items (collection_id, created_at desc);
create index if not exists cms_items_status_idx
  on public.cms_items (status);

drop trigger if exists cms_items_updated_at on public.cms_items;
create trigger cms_items_updated_at
  before update on public.cms_items
  for each row execute function public.set_updated_at();

alter table public.cms_collections enable row level security;
alter table public.cms_fields enable row level security;
alter table public.cms_items enable row level security;

drop policy if exists "admin all cms_collections" on public.cms_collections;
create policy "admin all cms_collections"
  on public.cms_collections for all
  to authenticated
  using (true) with check (true);

drop policy if exists "admin all cms_fields" on public.cms_fields;
create policy "admin all cms_fields"
  on public.cms_fields for all
  to authenticated
  using (true) with check (true);

drop policy if exists "admin all cms_items" on public.cms_items;
create policy "admin all cms_items"
  on public.cms_items for all
  to authenticated
  using (true) with check (true);
