-- Portfolio CMS - settings key/value table
-- Run in Supabase SQL editor, or via `supabase db push`.
-- Stores small site-wide settings such as the resume PDF URL that
-- `npm run build:site` injects into every "Resume" link.

create table if not exists public.settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

create trigger settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

alter table public.settings enable row level security;

-- Authenticated admin: full read + write.
create policy "settings read (auth)"
  on public.settings for select
  to authenticated
  using (true);

create policy "settings write (auth)"
  on public.settings for all
  to authenticated
  using (true) with check (true);

-- Seed the single row the CMS manages.
insert into public.settings (key, value)
  values ('resume_url', null)
  on conflict (key) do nothing;
