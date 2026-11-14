drop policy "Published films are public" on public.films;
drop policy "Admins manage films" on public.films;
create policy "Public reads published films" on public.films for select to anon using (published);
create policy "Members read published or managed films" on public.films for select to authenticated
  using (published or exists (select 1 from public.gallery_admins where user_id = (select auth.uid())));
create policy "Admins insert films" on public.films for insert to authenticated
  with check (exists (select 1 from public.gallery_admins where user_id = (select auth.uid())));
create policy "Admins update films" on public.films for update to authenticated
  using (exists (select 1 from public.gallery_admins where user_id = (select auth.uid())))
  with check (exists (select 1 from public.gallery_admins where user_id = (select auth.uid())));
create policy "Admins delete films" on public.films for delete to authenticated
  using (exists (select 1 from public.gallery_admins where user_id = (select auth.uid())));
