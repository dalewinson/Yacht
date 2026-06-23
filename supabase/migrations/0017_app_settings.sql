-- Global app settings (single row). "Due soon" lead times.
create table public.app_settings (
  id             int primary key default 1,
  due_soon_days  int not null default 14,
  due_soon_hours int not null default 15,
  constraint app_settings_singleton check (id = 1)
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

alter table public.app_settings enable row level security;
create policy "anon read: app_settings"   on public.app_settings for select using (true);
create policy "anon update: app_settings" on public.app_settings for update using (true);

notify pgrst, 'reload schema';
