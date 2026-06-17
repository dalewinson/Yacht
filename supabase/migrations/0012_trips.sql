-- Voyage / boat log: one row per outing, with a freeform timeline of events.
create table public.trips (
  id                 uuid primary key default gen_random_uuid(),
  vessel_id          uuid references public.vessels(id) on delete cascade,
  date               date not null,
  captain            text,
  purpose            text,
  cruise_area        text,
  sky                text,
  wind_speed         integer,
  wind_dir           text,
  port_engine_start  integer,
  port_engine_end    integer,
  stbd_engine_start  integer,
  stbd_engine_end    integer,
  gen_equipment_id   uuid references public.equipment(id) on delete set null,
  gen_start          integer,
  gen_end            integer,
  fuel_start         numeric,
  fuel_end           numeric,
  timeline           jsonb not null default '[]',   -- [{time, label}]
  notes              text,
  created_at         timestamptz not null default now()
);
alter table public.trips enable row level security;
create index trips_vessel_idx on public.trips(vessel_id);

create policy "anon read: trips"   on public.trips for select using (true);
create policy "anon insert: trips" on public.trips for insert with check (true);
create policy "anon update: trips" on public.trips for update using (true);
create policy "anon delete: trips" on public.trips for delete using (true);

notify pgrst, 'reload schema';
