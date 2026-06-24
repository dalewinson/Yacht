-- What was done to resolve the ticket.
alter table public.tickets add column if not exists resolution text;

notify pgrst, 'reload schema';
