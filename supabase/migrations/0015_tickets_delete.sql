-- Allow deleting tickets (cascades ticket_notes and ticket_attachments).
create policy "anon delete: tickets" on public.tickets for delete using (true);

notify pgrst, 'reload schema';
