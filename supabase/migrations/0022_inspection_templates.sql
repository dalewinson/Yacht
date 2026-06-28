-- Per-vessel customizable inspection templates. A vessel with no row falls back
-- to the built-in default (the "Power" preset) in the app.
create table if not exists public.inspection_templates (
  vessel_id  uuid primary key references public.vessels(id) on delete cascade,
  sections   jsonb not null default '[]',
  updated_at timestamptz not null default now()
);
alter table public.inspection_templates enable row level security;
create policy "anon read: inspection_templates"   on public.inspection_templates for select using (true);
create policy "anon insert: inspection_templates" on public.inspection_templates for insert with check (true);
create policy "anon update: inspection_templates" on public.inspection_templates for update using (true);
create policy "anon delete: inspection_templates" on public.inspection_templates for delete using (true);

-- Each completed inspection stores a snapshot of the template it was built on,
-- so later template edits never alter past inspections or their reports.
alter table public.inspections add column if not exists template jsonb;

notify pgrst, 'reload schema';
