-- Optionally link a ticket to a piece of equipment.
alter table public.tickets add column if not exists equipment_id uuid references public.equipment(id) on delete set null;
create index if not exists tickets_equipment_idx on public.tickets(equipment_id);

notify pgrst, 'reload schema';
