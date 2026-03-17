-- RLS Policies

alter table public.staffs enable row level security;
alter table public.catalog_categories enable row level security;
alter table public.catalog_items enable row level security;
alter table public.hair_colors enable row level security;
alter table public.sessions enable row level security;
alter table public.session_generations enable row level security;

-- staffs
create policy "staffs_select_own" on public.staffs
  for select using (auth_user_id = auth.uid());
create policy "staffs_select_admin" on public.staffs
  for select using (
    exists (select 1 from public.staffs s
            where s.auth_user_id = auth.uid() and s.role in ('admin', 'manager'))
  );

-- catalog
create policy "catalog_select_all" on public.catalog_items
  for select using (true);
create policy "catalog_insert_admin" on public.catalog_items
  for insert with check (
    exists (select 1 from public.staffs s
            where s.auth_user_id = auth.uid() and s.role in ('admin', 'manager'))
  );
create policy "catalog_update_admin" on public.catalog_items
  for update using (
    exists (select 1 from public.staffs s
            where s.auth_user_id = auth.uid() and s.role in ('admin', 'manager'))
  );
create policy "catalog_categories_select_all" on public.catalog_categories
  for select using (true);
create policy "hair_colors_select_all" on public.hair_colors
  for select using (true);

-- sessions
create policy "sessions_select_own" on public.sessions
  for select using (
    staff_id in (select id from public.staffs where auth_user_id = auth.uid())
  );
create policy "sessions_select_admin" on public.sessions
  for select using (
    exists (select 1 from public.staffs s
            where s.auth_user_id = auth.uid() and s.role in ('admin', 'manager'))
  );
create policy "sessions_insert_own" on public.sessions
  for insert with check (
    staff_id in (select id from public.staffs where auth_user_id = auth.uid())
  );
create policy "sessions_update_own" on public.sessions
  for update using (
    staff_id in (select id from public.staffs where auth_user_id = auth.uid())
  );

-- generations
create policy "generations_select" on public.session_generations
  for select using (session_id in (select id from public.sessions));
create policy "generations_insert" on public.session_generations
  for insert with check (session_id in (select id from public.sessions));
create policy "generations_update" on public.session_generations
  for update using (session_id in (select id from public.sessions));
