-- Flexible service intervals: by engine hours or by months.
-- interval_type: 'hours' | 'months'; interval_value: e.g. 150 (hours) or 12 (months).
-- For hours-based items, track the current reading + the reading at last service.
alter table public.equipment add column if not exists interval_type       text check (interval_type in ('hours','months'));
alter table public.equipment add column if not exists interval_value      integer;
alter table public.equipment add column if not exists current_hours       integer;
alter table public.equipment add column if not exists last_service_hours  integer;
