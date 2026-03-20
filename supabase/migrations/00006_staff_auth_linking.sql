-- Link auth.users and public.staffs by email for SSO bootstrap

create or replace function public.link_staff_from_auth_user()
returns trigger as $$
begin
  if new.email is null or length(trim(new.email)) = 0 then
    return new;
  end if;

  update public.staffs
  set auth_user_id = new.id
  where lower(email) = lower(new.email)
    and (auth_user_id is null or auth_user_id = new.id);

  return new;
end;
$$ language plpgsql security definer set search_path = public, auth;

drop trigger if exists trg_auth_users_link_staff on auth.users;
create trigger trg_auth_users_link_staff
  after insert or update of email on auth.users
  for each row execute function public.link_staff_from_auth_user();

create or replace function public.link_auth_user_from_staff()
returns trigger as $$
declare
  matched_auth_user_id uuid;
begin
  if new.auth_user_id is not null or new.email is null or length(trim(new.email)) = 0 then
    return new;
  end if;

  select id
    into matched_auth_user_id
  from auth.users
  where lower(email) = lower(new.email)
  order by created_at asc
  limit 1;

  if matched_auth_user_id is not null then
    new.auth_user_id = matched_auth_user_id;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public, auth;

drop trigger if exists trg_staffs_link_auth_user on public.staffs;
create trigger trg_staffs_link_auth_user
  before insert or update of email on public.staffs
  for each row execute function public.link_auth_user_from_staff();
