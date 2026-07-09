-- FIX RLS CHO SOCIALHUB BYD NEG
-- Chạy file này trong Supabase SQL Editor nếu web báo:
-- "new row violates row-level security policy"
-- Điều kiện: người dùng phải đăng nhập bằng Supabase Auth trên website.

alter table public.posts enable row level security;
alter table public.media_library enable row level security;
alter table public.channel_accounts enable row level security;
alter table public.monthly_kpis enable row level security;
alter table public.google_business enable row level security;

drop policy if exists posts_authenticated_all on public.posts;
drop policy if exists media_library_authenticated_all on public.media_library;
drop policy if exists channel_accounts_authenticated_all on public.channel_accounts;
drop policy if exists monthly_kpis_authenticated_all on public.monthly_kpis;
drop policy if exists google_business_authenticated_all on public.google_business;

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

-- Storage bucket post-images: cho tài khoản đã đăng nhập upload/xem/sửa/xóa file.
drop policy if exists post_images_authenticated_select on storage.objects;
drop policy if exists post_images_authenticated_insert on storage.objects;
drop policy if exists post_images_authenticated_update on storage.objects;
drop policy if exists post_images_authenticated_delete on storage.objects;

create policy post_images_authenticated_select
on storage.objects
for select
to authenticated
using (bucket_id = 'post-images');

create policy post_images_authenticated_insert
on storage.objects
for insert
to authenticated
with check (bucket_id = 'post-images');

create policy post_images_authenticated_update
on storage.objects
for update
to authenticated
using (bucket_id = 'post-images')
with check (bucket_id = 'post-images');

create policy post_images_authenticated_delete
on storage.objects
for delete
to authenticated
using (bucket_id = 'post-images');
