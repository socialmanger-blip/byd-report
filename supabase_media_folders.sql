-- Chạy một lần trong Supabase SQL Editor.
-- Bảng riêng này lưu cấu trúc folder Media Library, độc lập với file và code giao diện.

create table if not exists public.media_library (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  folder text not null,
  url text not null,
  type text default '',
  size bigint default 0,
  uploaded_at timestamptz default now()
);

alter table public.media_library enable row level security;
drop policy if exists media_library_authenticated_all on public.media_library;
create policy media_library_authenticated_all
on public.media_library
for all
to authenticated
using (true)
with check (true);

create table if not exists public.media_folders (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.media_folders enable row level security;

drop policy if exists media_folders_authenticated_all on public.media_folders;
create policy media_folders_authenticated_all
on public.media_folders
for all
to authenticated
using (true)
with check (true);

-- Chuyển folder cũ nếu project đã có bảng media_library.
-- Nếu bảng chưa tồn tại, bỏ qua bước chuyển dữ liệu thay vì làm hỏng toàn bộ migration.
do $$
begin
  if to_regclass('public.media_library') is not null then
    insert into public.media_folders(path)
    select distinct folder
    from public.media_library
    where type = 'folder' and folder is not null and folder <> ''
    on conflict (path) do nothing;
  end if;
end $$;

select path, updated_at from public.media_folders order by path;
