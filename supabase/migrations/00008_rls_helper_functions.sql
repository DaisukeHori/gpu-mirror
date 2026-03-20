create or replace function public.current_staff_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.staffs
  where auth_user_id = auth.uid()
    and is_active = true
  limit 1
$$;

create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.staffs
  where auth_user_id = auth.uid()
    and is_active = true
  limit 1
$$;

create or replace function public.current_staff_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_staff_role() in ('admin', 'manager'), false)
$$;

drop policy if exists "staffs_select_admin" on public.staffs;
create policy "staffs_select_admin" on public.staffs
  for select using (public.current_staff_is_admin());

drop policy if exists "catalog_insert_admin" on public.catalog_items;
create policy "catalog_insert_admin" on public.catalog_items
  for insert with check (public.current_staff_is_admin());

drop policy if exists "catalog_update_admin" on public.catalog_items;
create policy "catalog_update_admin" on public.catalog_items
  for update using (public.current_staff_is_admin());

drop policy if exists "sessions_select_own" on public.sessions;
create policy "sessions_select_own" on public.sessions
  for select using (staff_id = public.current_staff_id());

drop policy if exists "sessions_select_admin" on public.sessions;
create policy "sessions_select_admin" on public.sessions
  for select using (public.current_staff_is_admin());

drop policy if exists "sessions_insert_own" on public.sessions;
create policy "sessions_insert_own" on public.sessions
  for insert with check (staff_id = public.current_staff_id());

drop policy if exists "sessions_update_own" on public.sessions;
create policy "sessions_update_own" on public.sessions
  for update using (staff_id = public.current_staff_id());
