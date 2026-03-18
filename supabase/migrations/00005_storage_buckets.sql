-- Storage buckets for REVOL Mirror
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('customer-photos', 'customer-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('reference-photos', 'reference-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('generated-photos', 'generated-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('catalog-photos', 'catalog-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- RLS: service_role (API server) has full access via service key, no public access needed
