-- FIX RIÊNG CHO BẢNG POSTS KHI TABLE EDITOR CÓ BÀI NHƯNG WEB KHÔNG HIỆN
-- Chạy trong Supabase SQL Editor.
-- Sau khi chạy xong: đăng xuất web, đăng nhập lại, bấm "Tải lại".

alter table public.posts enable row level security;

drop policy if exists posts_authenticated_all on public.posts;
drop policy if exists posts_select_authenticated on public.posts;
drop policy if exists posts_insert_authenticated on public.posts;
drop policy if exists posts_update_authenticated on public.posts;
drop policy if exists posts_delete_authenticated on public.posts;

create policy posts_select_authenticated
on public.posts
for select
to authenticated
using (true);

create policy posts_insert_authenticated
on public.posts
for insert
to authenticated
with check (true);

create policy posts_update_authenticated
on public.posts
for update
to authenticated
using (true)
with check (true);

create policy posts_delete_authenticated
on public.posts
for delete
to authenticated
using (true);

-- Kiểm tra nhanh số bài đang có.
select count(*) as total_posts from public.posts;
