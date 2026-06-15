-- The app uses the anon key and has no auth; vessels only had a service-role
-- policy + an anon read policy, so "Add a boat" failed RLS. Allow anon writes,
-- consistent with the other tables.
create policy "anon insert: vessels" on public.vessels for insert with check (true);
create policy "anon update: vessels" on public.vessels for update using (true);
