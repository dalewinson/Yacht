-- SMS-to-ticket: capture who texted + any photos/videos that came with it.
alter table public.tickets add column if not exists reported_by text;   -- e.g. sender phone for SMS tickets

create table public.ticket_attachments (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null references public.tickets(id) on delete cascade,
  storage_path text not null,            -- path within the 'ticket-media' bucket
  content_type text,
  created_at   timestamptz not null default now()
);
alter table public.ticket_attachments enable row level security;
create index ticket_attachments_ticket_idx on public.ticket_attachments(ticket_id);

create policy "anon read: ticket_attachments"   on public.ticket_attachments for select using (true);
create policy "anon insert: ticket_attachments" on public.ticket_attachments for insert with check (true);
create policy "anon delete: ticket_attachments" on public.ticket_attachments for delete using (true);

insert into storage.buckets (id, name, public)
values ('ticket-media', 'ticket-media', true)
on conflict (id) do nothing;

create policy "anon read ticket-media"   on storage.objects for select using (bucket_id = 'ticket-media');
create policy "anon insert ticket-media" on storage.objects for insert with check (bucket_id = 'ticket-media');
create policy "anon delete ticket-media" on storage.objects for delete using (bucket_id = 'ticket-media');

notify pgrst, 'reload schema';
