-- Portfolio CMS - add manual sort order (priority) to projects
-- Run in Supabase SQL editor after 0001_init.sql.

alter table public.projects
  add column if not exists sort_order int not null default 0;

create index if not exists projects_sort_idx on public.projects (sort_order);

-- Backfill a stable initial order based on the current date ordering
-- (newest first == lowest sort_order), so drag-and-drop starts from a
-- sensible baseline instead of everything at 0.
with ranked as (
  select
    id,
    row_number() over (
      order by project_date desc nulls last, created_at desc
    ) - 1 as rn
  from public.projects
)
update public.projects p
set sort_order = ranked.rn
from ranked
where p.id = ranked.id;
