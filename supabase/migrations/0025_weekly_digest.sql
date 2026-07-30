-- Weekly email digest: recipient email on each person + schedule settings.
alter table public.app_users add column if not exists email text;

alter table public.app_settings add column if not exists digest_enabled     boolean not null default false;
alter table public.app_settings add column if not exists digest_day         integer not null default 1;  -- 0=Sun … 6=Sat (default Monday)
alter table public.app_settings add column if not exists digest_hour        integer not null default 7;  -- local hour (0-23)
alter table public.app_settings add column if not exists digest_admin_email text;
alter table public.app_settings add column if not exists digest_last_sent   date;

notify pgrst, 'reload schema';
