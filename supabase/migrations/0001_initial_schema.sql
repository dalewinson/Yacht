-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── VESSELS ────────────────────────────────────────────────────────────────
create table public.vessels (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  owner_name    text not null,
  owner_phone   text not null unique,  -- E.164 format, used for Twilio lookup
  notes         text,
  created_at    timestamptz not null default now()
);

alter table public.vessels enable row level security;

-- ─── TICKETS ────────────────────────────────────────────────────────────────
create type public.ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');
create type public.ticket_priority as enum ('low', 'medium', 'high', 'urgent');

create table public.tickets (
  id            uuid primary key default gen_random_uuid(),
  vessel_id     uuid not null references public.vessels(id) on delete cascade,
  title         text not null,
  description   text,
  status        public.ticket_status   not null default 'open',
  priority      public.ticket_priority not null default 'medium',
  source        text not null default 'manual',  -- 'manual' | 'sms' | 'email'
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.tickets enable row level security;

-- Keep updated_at current automatically
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tickets_updated_at
  before update on public.tickets
  for each row execute procedure public.set_updated_at();

-- ─── TICKET NOTES ───────────────────────────────────────────────────────────
create table public.ticket_notes (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.tickets(id) on delete cascade,
  body        text not null,
  author      text not null default 'staff',
  created_at  timestamptz not null default now()
);

alter table public.ticket_notes enable row level security;

-- ─── INDEXES ────────────────────────────────────────────────────────────────
create index tickets_vessel_id_idx    on public.tickets(vessel_id);
create index tickets_status_idx       on public.tickets(status);
create index ticket_notes_ticket_idx  on public.ticket_notes(ticket_id);
create index vessels_owner_phone_idx  on public.vessels(owner_phone);

-- ─── RLS POLICIES ───────────────────────────────────────────────────────────
-- Service role bypasses RLS; these policies cover anon/authenticated reads.
-- Adjust to match your auth strategy (e.g. Supabase Auth user_id column).

-- Allow service role full access (used by API routes / Twilio webhook)
create policy "service role full access: vessels"
  on public.vessels for all
  using (auth.role() = 'service_role');

create policy "service role full access: tickets"
  on public.tickets for all
  using (auth.role() = 'service_role');

create policy "service role full access: ticket_notes"
  on public.ticket_notes for all
  using (auth.role() = 'service_role');
