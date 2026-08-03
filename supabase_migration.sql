-- Chạy trong Supabase SQL Editor để cập nhật bảng posts cho Social Hub BYD NEG.
alter table public.posts
add column if not exists image_urls text[] default '{}',
add column if not exists media_urls text[] default '{}',
add column if not exists thumbnail_url text default '',
add column if not exists post_time time,
add column if not exists post_link text default '',
add column if not exists owner text default '',
add column if not exists hashtags text default '',
add column if not exists content text default '',
add column if not exists performance_metrics jsonb default '{}'::jsonb;

create index if not exists posts_post_date_idx on public.posts(post_date);
create index if not exists posts_platform_idx on public.posts(platform);
create index if not exists posts_showroom_idx on public.posts(showroom);

-- Dữ liệu Media Library: thư mục và file đã upload.
create table if not exists public.media_library (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  folder text not null,
  url text not null,
  type text default '',
  size bigint default 0,
  uploaded_at timestamptz default now()
);

create table if not exists public.media_folders (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Link account + ảnh đại diện theo từng nền tảng/showroom.
create table if not exists public.channel_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  showroom text not null,
  link text default '',
  avatar text default '',
  updated_at timestamptz default now(),
  unique(platform, showroom)
);

-- KPI tháng cho dashboard showroom.
create table if not exists public.monthly_kpis (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  showroom text not null,
  platform text not null,
  reach bigint default 0,
  engagement bigint default 0,
  follow bigint default 0,
  like_count bigint default 0,
  updated_at timestamptz default now(),
  unique(month, showroom, platform)
);

-- Báo cáo Google Business/Google Maps.
create table if not exists public.google_business (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text default '',
  address text default '',
  image text default '',
  map_link text default '',
  reviews bigint default 0,
  target bigint default 100,
  updated_at timestamptz default now()
);

alter table public.media_library enable row level security;
alter table public.channel_accounts enable row level security;
alter table public.monthly_kpis enable row level security;
alter table public.google_business enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'media_library' and policyname = 'media_library_public_read') then
    create policy media_library_public_read on public.media_library for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'media_library' and policyname = 'media_library_public_insert') then
    create policy media_library_public_insert on public.media_library for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'media_library' and policyname = 'media_library_public_update') then
    create policy media_library_public_update on public.media_library for update using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'media_library' and policyname = 'media_library_public_delete') then
    create policy media_library_public_delete on public.media_library for delete using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'channel_accounts' and policyname = 'channel_accounts_public_all') then
    create policy channel_accounts_public_all on public.channel_accounts for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'monthly_kpis' and policyname = 'monthly_kpis_public_all') then
    create policy monthly_kpis_public_all on public.monthly_kpis for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'google_business' and policyname = 'google_business_public_all') then
    create policy google_business_public_all on public.google_business for all using (true) with check (true);
  end if;
end $$;

-- Bảo mật đăng nhập: chỉ user đã đăng nhập Supabase Auth mới được đọc/ghi dữ liệu.
-- Chạy block này sau khi bạn đã tạo tài khoản trong Supabase > Authentication > Users.
alter table public.posts enable row level security;
alter table public.media_library enable row level security;
alter table public.channel_accounts enable row level security;
alter table public.monthly_kpis enable row level security;
alter table public.google_business enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('posts', 'media_library', 'channel_accounts', 'monthly_kpis', 'google_business')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end $$;

create policy posts_authenticated_all
on public.posts
for all
to authenticated
using (true)
with check (true);

create policy media_library_authenticated_all
on public.media_library
for all
to authenticated
using (true)
with check (true);

create policy channel_accounts_authenticated_all
on public.channel_accounts
for all
to authenticated
using (true)
with check (true);

create policy monthly_kpis_authenticated_all
on public.monthly_kpis
for all
to authenticated
using (true)
with check (true);

create policy google_business_authenticated_all
on public.google_business
for all
to authenticated
using (true)
with check (true);

-- Storage: cho user đã đăng nhập thao tác với bucket post-images.
-- Nếu bucket đang public, người có link ảnh vẫn có thể xem ảnh trực tiếp; còn website và dữ liệu đã bị khóa bằng Auth/RLS.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'post_images_authenticated_select') then
    create policy post_images_authenticated_select
    on storage.objects for select
    to authenticated
    using (bucket_id = 'post-images');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'post_images_authenticated_insert') then
    create policy post_images_authenticated_insert
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'post-images');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'post_images_authenticated_update') then
    create policy post_images_authenticated_update
    on storage.objects for update
    to authenticated
    using (bucket_id = 'post-images')
    with check (bucket_id = 'post-images');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'post_images_authenticated_delete') then
    create policy post_images_authenticated_delete
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'post-images');
  end if;
end $$;
