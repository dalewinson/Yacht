-- Inspection redesign, Phase 1 foundation:
--   * equipment gets an "area" (physical location) alongside its category
--   * service_tasks becomes the unified per-equipment "items" list:
--       - interval optional (no interval = inspection-only check)
--       - field_type = how it's checked (ok / text reading / number)
--       - sort_order for ordering within a piece of equipment
--   * areas are a managed category kind

alter table public.equipment add column if not exists area text;

alter table public.service_tasks alter column interval_type  drop not null;
alter table public.service_tasks alter column interval_value drop not null;
alter table public.service_tasks add column if not exists field_type text not null default 'ok';
alter table public.service_tasks add column if not exists sort_order integer not null default 0;

alter table public.categories drop constraint if exists categories_kind_check;
alter table public.categories add constraint categories_kind_check check (kind in ('equipment','contact','area'));
insert into public.categories (kind, name, sort_order) values
  ('area','Engine Room',0),('area','Flybridge',1),('area','Helm',2),('area','Salon',3),
  ('area','Cockpit',4),('area','Deck',5),('area','Bilge',6),('area','Staterooms',7),('area','General',9)
on conflict (kind, name) do nothing;

notify pgrst, 'reload schema';
