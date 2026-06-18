-- User-managed categories for Equipment (kind='equipment') and Contacts (kind='contact').
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('equipment','contact')),
  name        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (kind, name)
);
alter table public.categories enable row level security;
create policy "anon read: categories"   on public.categories for select using (true);
create policy "anon insert: categories" on public.categories for insert with check (true);
create policy "anon update: categories" on public.categories for update using (true);
create policy "anon delete: categories" on public.categories for delete using (true);

insert into public.categories (kind, name, sort_order) values
  ('equipment','Vessel',0),('equipment','Propulsion',1),('equipment','Electrical',2),
  ('equipment','Safety',3),('equipment','Navigation',4),('equipment','HVAC',5),
  ('equipment','Plumbing',6),('equipment','Systems',7),('equipment','Deck',8),
  ('contact','Owner',0),('contact','Captain',1),('contact','Engineer',2),
  ('contact','Deckhand',3),('contact','Technician',4),('contact','Vendor',5),
  ('contact','Marina',6),('contact','Emergency',7)
on conflict (kind, name) do nothing;

-- Contacts role was a Postgres enum; convert to free text so roles can be edited.
alter table public.crew alter column role drop default;
alter table public.crew alter column role type text using role::text;
alter table public.crew alter column role set default 'Technician';

notify pgrst, 'reload schema';
