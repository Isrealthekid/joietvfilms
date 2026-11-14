create table public.gallery_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.gallery_admins enable row level security;
revoke all on public.gallery_admins from anon, authenticated;
grant select on public.gallery_admins to authenticated;
create policy "Admins can check their own membership" on public.gallery_admins
  for select to authenticated using (user_id = (select auth.uid()));

create table public.films (
  id integer generated always as identity primary key,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  subtitle text not null default '' check (char_length(subtitle) <= 240),
  genre text not null default '' check (char_length(genre) <= 80),
  release_year integer check (release_year between 1888 and 2200),
  runtime_minutes integer check (runtime_minutes between 1 and 1440),
  director text not null default '' check (char_length(director) <= 160),
  cast_names text[] not null default '{}' check (cardinality(cast_names) <= 50),
  synopsis text not null default '' check (char_length(synopsis) <= 4000),
  youtube_url text not null default '' check (youtube_url = '' or youtube_url ~ '^https://(www\.|m\.)?(youtube\.com/(watch\?v=|embed/|shorts/|live/)|youtu\.be/)[A-Za-z0-9_-]{11}([?&].*)?$'),
  poster_url text not null default '' check (poster_url = '' or poster_url ~ '^https://'),
  poster_key text not null default '',
  color text not null default '#e8d9b7' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_new boolean not null default false,
  published boolean not null default false,
  sort_order integer not null default 0 check (sort_order between -100000 and 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complete_published_films check (not published or (
    poster_url <> '' and poster_key <> '' and btrim(synopsis) <> '' and btrim(director) <> '' and cardinality(cast_names) > 0
  ))
);
alter table public.films enable row level security;
revoke all on public.films from anon, authenticated;
grant select on public.films to anon, authenticated;
grant insert, update, delete on public.films to authenticated;
grant usage on sequence public.films_id_seq to authenticated;
create policy "Published films are public" on public.films for select to anon, authenticated using (published);
create policy "Admins manage films" on public.films for all to authenticated
  using (exists (select 1 from public.gallery_admins where user_id = (select auth.uid())))
  with check (exists (select 1 from public.gallery_admins where user_id = (select auth.uid())));
create index films_published_order_idx on public.films (sort_order, id) where published;
create index films_poster_key_idx on public.films (poster_key) where poster_key <> '';

create function public.set_film_updated_at() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_film_updated_at() from public, anon, authenticated;
create trigger films_updated_at before update on public.films for each row execute function public.set_film_updated_at();
