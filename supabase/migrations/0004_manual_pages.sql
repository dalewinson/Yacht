-- Store extracted per-page text so the AI can be sent only the relevant pages
-- of large manuals instead of the whole PDF (which can exceed the model's limit).
alter table public.manuals add column if not exists pages jsonb;       -- string[] of page text
alter table public.manuals add column if not exists indexed_at timestamptz;
alter table public.manuals add column if not exists page_count integer;
