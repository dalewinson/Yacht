-- Inspection redesign, Phase 2: equipment-driven inspections.
-- Old inspections stay 'v1' (section-based) and render unchanged; new ones are
-- 'v2' and store answers keyed by equipment + item, plus a frozen snapshot.
alter table public.inspections add column if not exists format            text not null default 'v1';
alter table public.inspections add column if not exists equipment_answers jsonb;
alter table public.inspections add column if not exists snapshot          jsonb;

notify pgrst, 'reload schema';
