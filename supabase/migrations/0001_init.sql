-- wordwork sync schema. Mirrors the synced types in src/db/schema.ts.
-- Local-only data (schedules, syncMeta, the `dirty` flag) has no table here.
--
-- Rules:
--   * Every row belongs to one user; RLS limits every operation to auth.uid().
--   * server_seq comes from one shared sequence, bumped by trigger on every
--     insert/update, so clients pull "rows with server_seq > cursor" and
--     device clock skew can't hide rows.
--   * Last-write-wins on updated_at (stale writes are dropped silently).
--   * No DELETE policy: removals are tombstones (deleted = true).
--   * Reviews are append-only: only `deleted` (undo) may change after insert;
--     edits to other columns are silently reverted.

create sequence public.ww_server_seq as bigint;

create function public.ww_guard_stale() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- An older client write must not overwrite a newer row.
  if new.updated_at < old.updated_at then
    return null;
  end if;
  return new;
end $$;

-- Serialise a user's writes until commit, so seq order matches commit order
-- and a pull cursor can't skip a row that committed late. Taken per statement,
-- before any row locks, so two pushes can't deadlock (row lock vs advisory lock).
-- Key class 1953 keeps these locks apart from other advisory-lock users.
create function public.ww_lock_user() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    perform pg_advisory_xact_lock(1953, hashtext(auth.uid()::text));
  end if;
  return null;
end $$;

create function public.ww_stamp_seq() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Re-entrant; covers callers with no auth.uid() (service role).
  perform pg_advisory_xact_lock(1953, hashtext(new.user_id::text));
  new.server_seq := nextval('public.ww_server_seq');
  return new;
end $$;

create function public.ww_guard_review() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Quietly restore immutable columns rather than raising: one bad row
  -- must not fail a whole batched push.
  new.id          := old.id;
  new.card_id     := old.card_id;
  new.rating      := old.rating;
  new.reviewed_at := old.reviewed_at;
  new.day         := old.day;
  new.duration_ms := old.duration_ms;
  new.device_id   := old.device_id;
  new.user_id     := old.user_id;
  return new;
end $$;

-- Columns every table shares (see `Synced` in schema.ts).
-- user_id defaults to the caller so clients never send it; RLS enforces it anyway.

create table public.decks (
  user_id    uuid   not null default auth.uid() references auth.users (id) on delete cascade,
  id         text   not null,
  language   text   not null,
  name       text   not null,
  created_at bigint not null,
  updated_at bigint not null,
  deleted    boolean not null default false,
  server_seq bigint not null,
  primary key (user_id, id)
);

create table public.cards (
  user_id              uuid    not null default auth.uid() references auth.users (id) on delete cascade,
  id                   text    not null,
  deck_id              text    not null,
  term                 text    not null,
  translation          text    not null,
  example              text,
  example_translation  text,
  extra                jsonb   not null default '{}'::jsonb check (jsonb_typeof(extra) = 'object'),
  tags                 text[]  not null default '{}',
  source               text,
  new_order            integer not null,
  suspended            boolean not null default false,
  created_at           bigint  not null,
  updated_at           bigint  not null,
  deleted              boolean not null default false,
  server_seq           bigint  not null,
  primary key (user_id, id)
);

create table public.reviews (
  user_id     uuid     not null default auth.uid() references auth.users (id) on delete cascade,
  id          text     not null,
  card_id     text     not null,
  rating      smallint not null check (rating between 1 and 4),
  reviewed_at bigint   not null,
  day         text     not null check (day ~ '^\d{4}-\d{2}-\d{2}$'),
  duration_ms integer  not null check (duration_ms >= 0),
  device_id   text     not null,
  updated_at  bigint   not null,
  deleted     boolean  not null default false,
  server_seq  bigint   not null,
  primary key (user_id, id)
);

create table public.minutes (
  user_id    uuid    not null default auth.uid() references auth.users (id) on delete cascade,
  id         text    not null,
  day        text    not null check (day ~ '^\d{4}-\d{2}-\d{2}$'),
  minutes    integer not null check (minutes >= 0),
  source     text    not null check (source in ('manual', 'review')),
  created_at bigint  not null,
  updated_at bigint  not null,
  deleted    boolean not null default false,
  server_seq bigint  not null,
  primary key (user_id, id)
);

create table public.diary (
  user_id    uuid    not null default auth.uid() references auth.users (id) on delete cascade,
  id         text    not null, -- `${day}:${language}`
  day        text    not null check (day ~ '^\d{4}-\d{2}-\d{2}$'),
  language   text    not null,
  text       text    not null,
  updated_at bigint  not null,
  deleted    boolean not null default false,
  server_seq bigint  not null,
  primary key (user_id, id),
  check (id = day || ':' || language)
);

create table public.songs (
  user_id    uuid    not null default auth.uid() references auth.users (id) on delete cascade,
  id         text    not null,
  language   text    not null,
  week_of    text    not null check (week_of ~ '^\d{4}-\d{2}-\d{2}$'),
  title      text    not null,
  artist     text    not null,
  url        text,
  notes      text    not null default '',
  updated_at bigint  not null,
  deleted    boolean not null default false,
  server_seq bigint  not null,
  primary key (user_id, id)
);

create table public.settings (
  user_id              uuid    not null default auth.uid() references auth.users (id) on delete cascade,
  id                   text    not null check (id = 'me'),
  time_zone            text    not null,
  rollover_hour        smallint not null check (rollover_hour between 0 and 23),
  new_per_day          integer not null check (new_per_day >= 0),
  max_reviews_per_day  integer not null check (max_reviews_per_day >= 0),
  goal_hours           integer not null check (goal_hours > 0),
  streak_minutes       integer not null check (streak_minutes > 0),
  updated_at           bigint  not null,
  deleted              boolean not null default false,
  server_seq           bigint  not null,
  primary key (user_id, id)
);

-- Triggers, pull index, RLS and grants for every synced table.
do $$
declare
  t text;
begin
  foreach t in array array['decks', 'cards', 'reviews', 'minutes', 'diary', 'songs', 'settings']
  loop
    -- Fire order is alphabetical: guards (ww_1_*) run before the seq stamp (ww_2_*).
    execute format(
      'create trigger ww_0_lock before insert or update on public.%I
         for each statement execute function public.ww_lock_user()', t);
    execute format(
      'create trigger ww_1_stale before update on public.%I
         for each row execute function public.ww_guard_stale()', t);
    execute format(
      'create trigger ww_2_seq before insert or update on public.%I
         for each row execute function public.ww_stamp_seq()', t);

    execute format('create index %I on public.%I (user_id, server_seq)', t || '_pull_idx', t);

    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (user_id = (select auth.uid()))', t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check (user_id = (select auth.uid()))', t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t || '_update_own', t);

    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
  end loop;
end $$;

-- Reviews: immutable except the undo tombstone. Named ww_0_ so it runs first.
create trigger ww_0_append_only before update on public.reviews
  for each row execute function public.ww_guard_review();

-- Triggers run as the caller, so they need the sequence.
revoke all on sequence public.ww_server_seq from anon, authenticated;
grant usage on sequence public.ww_server_seq to authenticated;

-- Trigger functions aren't API surface; keep them out of PostgREST's RPC.
revoke execute on function public.ww_guard_stale(), public.ww_lock_user(), public.ww_stamp_seq(), public.ww_guard_review()
  from public, anon, authenticated;
