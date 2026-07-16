-- Portfolio CMS - initial schema, RLS, storage
-- Run in Supabase SQL editor, or via `supabase db push`.

-- ─────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- updated_at trigger helper
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- categories
-- ─────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- projects
-- ─────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  subtitle text,
  company_name text,
  category_id uuid references public.categories (id) on delete set null,
  live_link text,
  project_date date,
  card_image_url text,
  gallery jsonb not null default '[]'::jsonb,
  body jsonb,
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_status_idx on public.projects (status);
create index if not exists projects_category_idx on public.projects (category_id);

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- posts (blog)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  cover_image_url text,
  body jsonb,
  tags text[] not null default '{}',
  reading_time int,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_status_idx on public.posts (status);

create trigger posts_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table public.categories enable row level security;
alter table public.projects enable row level security;
alter table public.posts enable row level security;

-- Public (anon) read: only published content.
create policy "public read published categories"
  on public.categories for select
  to anon
  using (published = true);

create policy "public read published projects"
  on public.projects for select
  to anon
  using (status = 'published');

create policy "public read published posts"
  on public.posts for select
  to anon
  using (status = 'published');

-- Authenticated admin: full read + write on everything.
create policy "admin all categories"
  on public.categories for all
  to authenticated
  using (true) with check (true);

create policy "admin all projects"
  on public.projects for all
  to authenticated
  using (true) with check (true);

create policy "admin all posts"
  on public.posts for all
  to authenticated
  using (true) with check (true);

-- ─────────────────────────────────────────────────────────────
-- Storage bucket for media (images)
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "public read media"
  on storage.objects for select
  to anon
  using (bucket_id = 'media');

create policy "admin write media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media');

create policy "admin update media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media');

create policy "admin delete media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media');
