-- Fill in missing anon update/delete policies for tables the UI mutates.
create policy "anon update: crew"          on public.crew         for update using (true);
create policy "anon delete: crew"          on public.crew         for delete using (true);
create policy "anon delete: parts"         on public.parts        for delete using (true);
create policy "anon delete: service_log"   on public.service_log  for delete using (true);
create policy "anon delete: vessels"       on public.vessels      for delete using (true);
create policy "anon update: inspections"   on public.inspections  for update using (true);

notify pgrst, 'reload schema';
