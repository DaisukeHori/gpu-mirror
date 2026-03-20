create unique index if not exists idx_staffs_email_unique on public.staffs (lower(email));
