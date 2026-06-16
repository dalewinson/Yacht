-- Tie inspections to equipment.
alter table public.equipment add column if not exists last_inspected date;
alter table public.tickets   add column if not exists inspection_ref text;  -- exact dedupe of inspection-created tickets

-- Per-boat memory of which inspection section/item maps to which equipment.
-- item_key '' = section-level link (engines/generators); non-empty = a specific row (e.g. nav/misc).
create table public.inspection_links (
  id            uuid primary key default gen_random_uuid(),
  vessel_id     uuid not null references public.vessels(id) on delete cascade,
  section_id    text not null,
  item_key      text not null default '',
  equipment_id  uuid references public.equipment(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (vessel_id, section_id, item_key)
);
alter table public.inspection_links enable row level security;
create index inspection_links_vessel_idx on public.inspection_links(vessel_id);

create policy "anon read: inspection_links"   on public.inspection_links for select using (true);
create policy "anon insert: inspection_links" on public.inspection_links for insert with check (true);
create policy "anon update: inspection_links" on public.inspection_links for update using (true);
create policy "anon delete: inspection_links" on public.inspection_links for delete using (true);

notify pgrst, 'reload schema';
