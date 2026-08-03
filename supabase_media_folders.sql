-- Chạy một lần trong Supabase SQL Editor.
-- Bảng riêng này lưu cấu trúc folder Media Library, độc lập với file và code giao diện.

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

-- Chuyển các folder cũ đang nằm trong media_library sang bảng mới.
insert into public.media_folders(path)
select distinct folder
from public.media_library
where type = 'folder' and folder is not null and folder <> ''
on conflict (path) do nothing;

select path, updated_at from public.media_folders order by path;
