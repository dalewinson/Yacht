-- Multiple service tasks per equipment item, each on its own interval.
create table public.service_tasks (
  id              uuid primary key default gen_random_uuid(),
  equipment_id    uuid not null references public.equipment(id) on delete cascade,
  vessel_id       uuid references public.vessels(id) on delete cascade,
  name            text not null,
  interval_type   text not null check (interval_type in ('hours','months')),
  interval_value  integer not null,
  last_done_date  date,
  last_done_hours integer,
  notes           text,
  created_at      timestamptz not null default now()
);
alter table public.service_tasks enable row level security;
create index service_tasks_equipment_idx on public.service_tasks(equipment_id);
create index service_tasks_vessel_idx on public.service_tasks(vessel_id);

create policy "anon read: service_tasks"   on public.service_tasks for select using (true);
create policy "anon insert: service_tasks" on public.service_tasks for insert with check (true);
create policy "anon update: service_tasks" on public.service_tasks for update using (true);
create policy "anon delete: service_tasks" on public.service_tasks for delete using (true);

-- Migrate each equipment's existing single interval into a task (nothing lost).
insert into public.service_tasks (equipment_id, vessel_id, name, interval_type, interval_value, last_done_date, last_done_hours)
select id, vessel_id,
       case when interval_type = 'hours' then 'Oil & filter' else 'Service' end,
       interval_type, interval_value, last_service, last_service_hours
from public.equipment
where interval_type is not null and interval_value is not null;

notify pgrst, 'reload schema';
