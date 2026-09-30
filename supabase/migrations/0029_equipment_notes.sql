-- Running notes log per equipment: dated, appended entries (not overwritten),
-- separate from the single equipment.notes "description" field.
create table if not exists public.equipment_notes (
  id           uuid primary key default gen_random_uuid(),
  equipment_id uuid references public.equipment(id) on delete cascade,
  vessel_id    uuid references public.vessels(id) on delete cascade,
  note         text not null,
  author       text,
  created_at   timestamptz not null default now()
);
create index if not exists equipment_notes_equipment_id_idx on public.equipment_notes(equipment_id, created_at desc);
alter table public.equipment_notes enable row level security;
create policy "anon all: equipment_notes" on public.equipment_notes for all using (true) with check (true);

notify pgrst, 'reload schema';
