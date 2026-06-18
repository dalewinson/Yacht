-- Allow deleting equipment (cascades its service_tasks; nulls trip gen links).
create policy "anon delete: equipment" on public.equipment for delete using (true);

notify pgrst, 'reload schema';
