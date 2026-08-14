-- Attach invoices / files to a service-log entry.
create table if not exists public.service_log_attachments (
  id             uuid primary key default gen_random_uuid(),
  service_log_id uuid references public.service_log(id) on delete cascade,
  storage_path   text not null,
  content_type   text,
  filename       text,
  created_at     timestamptz not null default now()
);
alter table public.service_log_attachments enable row level security;
create policy "anon all: service_log_attachments" on public.service_log_attachments for all using (true) with check (true);

notify pgrst, 'reload schema';
