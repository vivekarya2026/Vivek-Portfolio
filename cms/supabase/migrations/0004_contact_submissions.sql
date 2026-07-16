-- Portfolio CMS - contact form submissions
-- Run ONLY this file in the Supabase SQL editor (do not re-run 0001_init.sql).

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null default '',
  email text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  email_sent boolean not null default false,
  email_error text,
  source text,
  created_at timestamptz not null default now()
);

create index if not exists contact_submissions_status_idx
  on public.contact_submissions (status);
create index if not exists contact_submissions_created_idx
  on public.contact_submissions (created_at desc);

alter table public.contact_submissions enable row level security;

-- Authenticated admin: full access in the CMS.
drop policy if exists "admin all contact_submissions" on public.contact_submissions;
create policy "admin all contact_submissions"
  on public.contact_submissions for all
  to authenticated
  using (true) with check (true);

-- Public inserts go through the Next.js /api/contact route (service role),
-- so anon has no direct table access.
