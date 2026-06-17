-- Where the part is stored on the boat (e.g. "Engine room, port locker").
alter table public.parts add column if not exists location text;

notify pgrst, 'reload schema';
