-- Optional per-vessel logo (public URL in Supabase Storage).
alter table public.vessels add column if not exists logo_url text;

notify pgrst, 'reload schema';
