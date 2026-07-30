-- Per-person logins (Option A: app-enforced scoping). Passcodes are stored as
-- sha256 hex (same scheme as the app password).
create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  role          text not null default 'owner' check (role in ('admin','owner','crew')),
  passcode_hash text not null,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Which vessels an owner/crew user may access (admins see all, ignore this).
create table if not exists public.user_vessels (
  user_id   uuid references public.app_users(id) on delete cascade,
  vessel_id uuid references public.vessels(id)   on delete cascade,
  primary key (user_id, vessel_id)
);

alter table public.app_users    enable row level security;
alter table public.user_vessels enable row level security;
create policy "anon all: app_users"    on public.app_users    for all using (true) with check (true);
create policy "anon all: user_vessels" on public.user_vessels for all using (true) with check (true);

notify pgrst, 'reload schema';
