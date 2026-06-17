-- Text-based double opt-in for the SMS-to-ticket line.
-- phone = sender's normalized last-10 digits.
create table public.sms_optins (
  phone        text primary key,
  full_from    text,
  opted_in     boolean not null default false,
  opted_in_at  timestamptz,
  created_at   timestamptz not null default now()
);
alter table public.sms_optins enable row level security;

create policy "anon read: sms_optins"   on public.sms_optins for select using (true);
create policy "anon insert: sms_optins" on public.sms_optins for insert with check (true);
create policy "anon update: sms_optins" on public.sms_optins for update using (true);

notify pgrst, 'reload schema';
