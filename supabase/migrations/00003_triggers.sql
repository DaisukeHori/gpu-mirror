-- Triggers

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_staffs_updated before update on public.staffs
  for each row execute function public.update_updated_at();
create trigger trg_catalog_items_updated before update on public.catalog_items
  for each row execute function public.update_updated_at();
create trigger trg_sessions_updated before update on public.sessions
  for each row execute function public.update_updated_at();

-- Catalog popularity counter
create or replace function public.increment_catalog_popularity()
returns trigger as $$
begin
  if new.catalog_item_id is not null and new.status = 'completed' then
    update public.catalog_items set popularity = popularity + 1
    where id = new.catalog_item_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_generations_popularity
  after update of status on public.session_generations
  for each row
  when (new.status = 'completed' and new.catalog_item_id is not null
        and new.angle = 'front')
  execute function public.increment_catalog_popularity();
