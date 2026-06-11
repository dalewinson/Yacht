-- ─── MANUALS ─────────────────────────────────────────────────────────────────
create table public.manuals (
  id                uuid primary key default gen_random_uuid(),
  vessel_id         uuid references public.vessels(id) on delete cascade,
  equipment_id      uuid references public.equipment(id) on delete set null,
  name              text not null,
  category          text,
  storage_path      text not null,            -- path within the 'manuals' storage bucket
  anthropic_file_id text,                      -- Files API file_id, set lazily on first question
  size_bytes        bigint,
  page_count        integer,
  uploaded_at       timestamptz not null default now()
);
alter table public.manuals enable row level security;
create index manuals_vessel_idx on public.manuals(vessel_id);
create index manuals_equipment_idx on public.manuals(equipment_id);

create policy "anon read: manuals"   on public.manuals for select using (true);
create policy "anon insert: manuals" on public.manuals for insert with check (true);
create policy "anon update: manuals" on public.manuals for update using (true);
create policy "anon delete: manuals" on public.manuals for delete using (true);

-- ─── STORAGE BUCKET ──────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('manuals', 'manuals', true)
on conflict (id) do nothing;

create policy "anon read manuals bucket"
  on storage.objects for select using (bucket_id = 'manuals');
create policy "anon upload manuals bucket"
  on storage.objects for insert with check (bucket_id = 'manuals');
create policy "anon update manuals bucket"
  on storage.objects for update using (bucket_id = 'manuals');
create policy "anon delete manuals bucket"
  on storage.objects for delete using (bucket_id = 'manuals');
