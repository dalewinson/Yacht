-- ─── EXTEND TICKETS ─────────────────────────────────────────────────────────
alter table public.tickets
  add column if not exists category  text,
  add column if not exists assigned_to text;

-- ─── EQUIPMENT ───────────────────────────────────────────────────────────────
create type public.service_interval as enum ('monthly','quarterly','biannual','annual');

create table public.equipment (
  id              uuid primary key default gen_random_uuid(),
  vessel_id       uuid not null references public.vessels(id) on delete cascade,
  name            text not null,
  category        text not null,
  model           text,
  serial          text,
  last_service    date,
  next_due        date,
  interval        public.service_interval not null default 'biannual',
  assigned_tech   text,
  notes           text,
  created_at      timestamptz not null default now()
);
alter table public.equipment enable row level security;
create index equipment_vessel_idx on public.equipment(vessel_id);
create index equipment_next_due_idx on public.equipment(next_due);

-- ─── SERVICE LOG ─────────────────────────────────────────────────────────────
create table public.service_log (
  id              uuid primary key default gen_random_uuid(),
  vessel_id       uuid not null references public.vessels(id) on delete cascade,
  equipment_id    uuid references public.equipment(id) on delete set null,
  equipment_name  text not null,
  date            date not null,
  work_performed  text not null,
  tech            text,
  cost            numeric(10,2),
  parts_used      text,
  notes           text,
  created_at      timestamptz not null default now()
);
alter table public.service_log enable row level security;
create index service_log_vessel_idx    on public.service_log(vessel_id);
create index service_log_equipment_idx on public.service_log(equipment_id);

-- ─── PARTS ───────────────────────────────────────────────────────────────────
create table public.parts (
  id              uuid primary key default gen_random_uuid(),
  vessel_id       uuid not null references public.vessels(id) on delete cascade,
  name            text not null,
  category        text not null,
  equipment_name  text,
  part_number     text,
  qty_on_hand     integer not null default 0,
  reorder_at      integer not null default 1,
  supplier        text,
  unit_cost       numeric(10,2),
  created_at      timestamptz not null default now()
);
alter table public.parts enable row level security;
create index parts_vessel_idx on public.parts(vessel_id);

-- ─── CREW ────────────────────────────────────────────────────────────────────
create type public.crew_role as enum ('Captain','Engineer','Deckhand','Technician','Marina','Vendor','Emergency','Owner');

create table public.crew (
  id              uuid primary key default gen_random_uuid(),
  vessel_id       uuid not null references public.vessels(id) on delete cascade,
  name            text not null,
  role            public.crew_role not null default 'Technician',
  phone           text,
  email           text,
  specialty       text,
  notes           text,
  avatar_color    text not null default '#185FA5',
  avatar_bg       text not null default '#E6F1FB',
  created_at      timestamptz not null default now()
);
alter table public.crew enable row level security;
create index crew_vessel_idx on public.crew(vessel_id);

-- ─── INSPECTIONS ─────────────────────────────────────────────────────────────
create table public.inspections (
  id              uuid primary key default gen_random_uuid(),
  vessel_id       uuid not null references public.vessels(id) on delete cascade,
  vessel_name     text not null,
  tech            text,
  date            date not null,
  month           text not null,
  year            integer not null,
  port_engine_hrs integer,
  stbd_engine_hrs integer,
  port_gen_hrs    integer,
  sections        jsonb not null default '{}',
  created_at      timestamptz not null default now()
);
alter table public.inspections enable row level security;
create index inspections_vessel_idx on public.inspections(vessel_id);

-- ─── RLS POLICIES ────────────────────────────────────────────────────────────
create policy "service role full access: equipment"
  on public.equipment for all using (auth.role() = 'service_role');
create policy "service role full access: service_log"
  on public.service_log for all using (auth.role() = 'service_role');
create policy "service role full access: parts"
  on public.parts for all using (auth.role() = 'service_role');
create policy "service role full access: crew"
  on public.crew for all using (auth.role() = 'service_role');
create policy "service role full access: inspections"
  on public.inspections for all using (auth.role() = 'service_role');

create policy "anon read: equipment"   on public.equipment   for select using (true);
create policy "anon read: service_log" on public.service_log for select using (true);
create policy "anon read: parts"       on public.parts       for select using (true);
create policy "anon read: crew"        on public.crew        for select using (true);
create policy "anon read: inspections" on public.inspections for select using (true);

create policy "anon insert: equipment"   on public.equipment   for insert with check (true);
create policy "anon insert: service_log" on public.service_log for insert with check (true);
create policy "anon insert: parts"       on public.parts       for insert with check (true);
create policy "anon insert: crew"        on public.crew        for insert with check (true);
create policy "anon insert: inspections" on public.inspections for insert with check (true);

create policy "anon update: equipment"   on public.equipment   for update using (true);
create policy "anon update: service_log" on public.service_log for update using (true);
create policy "anon update: parts"       on public.parts       for update using (true);
create policy "anon update: tickets"     on public.tickets     for update using (true);
