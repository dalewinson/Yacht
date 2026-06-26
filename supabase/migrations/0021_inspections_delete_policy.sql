-- Allow deleting inspections from the app (single-tenant, permissive anon RLS).
create policy "anon delete: inspections" on public.inspections for delete using (true);

notify pgrst, 'reload schema';
