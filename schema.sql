-- HOUSE OF MOVIES V3 database
create extension if not exists pgcrypto;

create table if not exists public.titles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (type in ('movie','series')),
  year integer,
  genre text,
  rating numeric(3,1) default 0 check (rating >= 0 and rating <= 10),
  description text,
  poster_url text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references public.titles(id) on delete cascade,
  season_number integer not null check (season_number > 0),
  name text,
  created_at timestamptz not null default now(),
  unique(title_id, season_number)
);

create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  episode_number integer not null check (episode_number > 0),
  title text,
  description text,
  video_url text,
  created_at timestamptz not null default now(),
  unique(season_id, episode_number)
);

create table if not exists public.download_links (
  id uuid primary key default gen_random_uuid(),
  title_id uuid references public.titles(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete cascade,
  quality text not null check (quality in ('480p','720p','1080p')),
  url text not null,
  created_at timestamptz not null default now(),
  check ((title_id is not null) <> (episode_id is not null))
);

create index if not exists titles_published_idx on public.titles(published);
create index if not exists titles_type_idx on public.titles(type);
create index if not exists seasons_title_idx on public.seasons(title_id);
create index if not exists episodes_season_idx on public.episodes(season_id);

-- Public catalog: visitors may only read published titles.
alter table public.titles enable row level security;
alter table public.seasons enable row level security;
alter table public.episodes enable row level security;
alter table public.download_links enable row level security;

revoke all on public.titles, public.seasons, public.episodes, public.download_links from anon;
revoke all on public.titles, public.seasons, public.episodes, public.download_links from authenticated;

grant select on public.titles, public.seasons, public.episodes, public.download_links to anon, authenticated;
grant insert, update, delete on public.titles, public.seasons, public.episodes, public.download_links to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  );
$$;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;

drop policy if exists "public read published titles" on public.titles;
create policy "public read published titles" on public.titles for select to anon, authenticated using (published = true or public.is_admin());
create policy "admins insert titles" on public.titles for insert to authenticated with check (public.is_admin());
create policy "admins update titles" on public.titles for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete titles" on public.titles for delete to authenticated using (public.is_admin());

drop policy if exists "public read seasons of published titles" on public.seasons;
create policy "public read seasons of published titles" on public.seasons for select to anon, authenticated using (exists(select 1 from public.titles t where t.id=title_id and (t.published=true or public.is_admin())));
create policy "admins insert seasons" on public.seasons for insert to authenticated with check (public.is_admin());
create policy "admins update seasons" on public.seasons for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete seasons" on public.seasons for delete to authenticated using (public.is_admin());

drop policy if exists "public read episodes" on public.episodes;
create policy "public read episodes" on public.episodes for select to anon, authenticated using (exists(select 1 from public.seasons s join public.titles t on t.id=s.title_id where s.id=season_id and (t.published=true or public.is_admin())));
create policy "admins insert episodes" on public.episodes for insert to authenticated with check (public.is_admin());
create policy "admins update episodes" on public.episodes for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete episodes" on public.episodes for delete to authenticated using (public.is_admin());

drop policy if exists "public read links" on public.download_links;
create policy "public read links" on public.download_links for select to anon, authenticated using (
  (title_id is not null and exists(select 1 from public.titles t where t.id=title_id and (t.published=true or public.is_admin())))
  or
  (episode_id is not null and exists(select 1 from public.episodes e join public.seasons s on s.id=e.season_id join public.titles t on t.id=s.title_id where e.id=episode_id and (t.published=true or public.is_admin())))
);
create policy "admins insert links" on public.download_links for insert to authenticated with check (public.is_admin());
create policy "admins update links" on public.download_links for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete links" on public.download_links for delete to authenticated using (public.is_admin());

-- AFTER creating your Supabase Auth user, run this with your real admin email:
-- insert into public.admin_users(user_id)
-- select id from auth.users where email = 'YOUR_ADMIN_EMAIL@example.com'
-- on conflict do nothing;


-- V3.1 poster storage
insert into storage.buckets (id,name,public)
values ('posters','posters',true)
on conflict (id) do update set public=true;

drop policy if exists "admins upload posters" on storage.objects;
create policy "admins upload posters" on storage.objects
for insert to authenticated
with check (bucket_id='posters' and public.is_admin());

drop policy if exists "public read posters" on storage.objects;
create policy "public read posters" on storage.objects
for select to public
using (bucket_id='posters');

drop policy if exists "admins update posters" on storage.objects;
create policy "admins update posters" on storage.objects
for update to authenticated
using (bucket_id='posters' and public.is_admin())
with check (bucket_id='posters' and public.is_admin());

drop policy if exists "admins delete posters" on storage.objects;
create policy "admins delete posters" on storage.objects
for delete to authenticated
using (bucket_id='posters' and public.is_admin());
