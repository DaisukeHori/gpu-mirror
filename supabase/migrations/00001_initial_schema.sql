-- REVOL Mirror: Initial schema
-- Design doc v1.3 Section 6.1

create extension if not exists "uuid-ossp";

-- staffs
create table public.staffs (
  id              uuid primary key default uuid_generate_v4(),
  auth_user_id    uuid unique references auth.users(id) on delete cascade,
  entra_id_oid    text unique,
  display_name    text not null,
  email           text not null,
  store_code      text,
  role            text not null default 'stylist'
                  check (role in ('admin', 'manager', 'stylist')),
  is_active       boolean not null default true,
  hubspot_owner_id text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_staffs_store on public.staffs(store_code);
create index idx_staffs_entra on public.staffs(entra_id_oid);

-- catalog_categories
create table public.catalog_categories (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  display_name    text not null,
  icon_name       text,
  sort_order      integer not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- catalog_items
create table public.catalog_items (
  id              uuid primary key default uuid_generate_v4(),
  category_id     uuid references public.catalog_categories(id) on delete set null,
  title           text not null,
  description     text,
  image_path      text not null,
  thumbnail_path  text,
  tags            text[] default '{}',
  gender          text not null default 'unisex'
                  check (gender in ('female', 'male', 'unisex')),
  popularity      integer not null default 0,
  is_active       boolean not null default true,
  created_by      uuid references public.staffs(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_catalog_category on public.catalog_items(category_id);
create index idx_catalog_tags on public.catalog_items using gin(tags);
create index idx_catalog_active on public.catalog_items(is_active) where is_active = true;
create index idx_catalog_popularity on public.catalog_items(popularity desc);

-- hair_colors
create table public.hair_colors (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  name_en         text,
  hex_code        text not null,
  color_family    text not null
                  check (color_family in (
                    'ブラック系', 'ブラウン系', 'ベージュ系', 'アッシュ系',
                    'グレー系', 'レッド系', 'ピンク系', 'オレンジ系',
                    'イエロー系', 'グリーン系', 'ブルー系', 'パープル系',
                    'ハイトーン系'
                  )),
  level           integer,
  sort_order      integer not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create index idx_hair_colors_family on public.hair_colors(color_family);

-- sessions
create table public.sessions (
  id                    uuid primary key default uuid_generate_v4(),
  staff_id              uuid not null references public.staffs(id),
  store_code            text,
  customer_photo_path   text not null,
  ai_model              text not null default 'gemini-3.1-flash-image-preview',
  is_closed             boolean not null default false,
  closed_at             timestamptz,
  hubspot_contact_id    text,
  hubspot_deal_id       text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_sessions_staff on public.sessions(staff_id);
create index idx_sessions_store on public.sessions(store_code);
create index idx_sessions_created on public.sessions(created_at desc);
create index idx_sessions_closed on public.sessions(is_closed);
create index idx_sessions_hubspot on public.sessions(hubspot_contact_id)
  where hubspot_contact_id is not null;

-- session_generations
create table public.session_generations (
  id                    uuid primary key default uuid_generate_v4(),
  session_id            uuid not null references public.sessions(id) on delete cascade,
  style_group           integer not null,
  angle                 text not null
                        check (angle in ('front', 'three_quarter', 'side', 'back', 'glamour')),
  simulation_mode       text not null default 'style'
                        check (simulation_mode in ('style', 'color', 'style_and_color')),
  reference_type        text not null
                        check (reference_type in ('catalog', 'upload', 'pinterest', 'color_only')),
  reference_photo_path  text,
  reference_source_url  text,
  catalog_item_id       uuid references public.catalog_items(id),
  hair_color_id         uuid references public.hair_colors(id),
  hair_color_custom     text,
  style_label           text,
  generated_photo_path  text,
  ai_prompt             text,
  ai_latency_ms         integer,
  ai_cost_usd           numeric(8,4),
  status                text not null default 'pending'
                        check (status in ('pending', 'generating', 'completed', 'failed')),
  is_favorite           boolean not null default false,
  is_selected           boolean not null default false,
  created_at            timestamptz not null default now()
);

create index idx_generations_session on public.session_generations(session_id);
create index idx_generations_style on public.session_generations(session_id, style_group);
create index idx_generations_status on public.session_generations(status);
create index idx_generations_favorite on public.session_generations(is_favorite)
  where is_favorite = true;
