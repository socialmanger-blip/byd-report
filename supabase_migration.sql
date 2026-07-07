-- Chạy trong Supabase SQL Editor để cập nhật bảng posts cho Social Hub BYD NEG.
alter table public.posts
add column if not exists image_urls text[] default '{}',
add column if not exists media_urls text[] default '{}',
add column if not exists thumbnail_url text default '',
add column if not exists post_time time,
add column if not exists post_link text default '',
add column if not exists owner text default '',
add column if not exists hashtags text default '',
add column if not exists content text default '';

create index if not exists posts_post_date_idx on public.posts(post_date);
create index if not exists posts_platform_idx on public.posts(platform);
create index if not exists posts_showroom_idx on public.posts(showroom);
