-- Link a ticket's reporter to a contact (crew). The existing reported_by text
-- column stays as a fallback (e.g. a raw phone number when no contact matches).
alter table public.tickets add column if not exists reported_by_id uuid references public.crew(id) on delete set null;
create index if not exists tickets_reported_by_idx on public.tickets(reported_by_id);

notify pgrst, 'reload schema';
