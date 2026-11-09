-- Guide checklist ticks. A row means "ticked"; unticking is a tombstone.
-- id is the item id for one-off items, `${day}:${item}` for daily ones.

create table public.ticks (
  user_id    uuid    not null default auth.uid() references auth.users (id) on delete cascade,
  id         text    not null check (id ~ '^[a-z0-9:.-]{1,80}$'),
  day        text    check (day ~ '^\d{4}-\d{2}-\d{2}$'),
  updated_at bigint  not null,
  deleted    boolean not null default false,
  server_seq bigint  not null,
  primary key (user_id, id),
  check (day is null or starts_with(id, day || ':'))
);

create trigger ww_0_lock before insert or update on public.ticks
  for each statement execute function public.ww_lock_user();
create trigger ww_1_stale before update on public.ticks
  for each row execute function public.ww_guard_stale();
create trigger ww_2_seq before insert or update on public.ticks
  for each row execute function public.ww_stamp_seq();

create index ticks_pull_idx on public.ticks (user_id, server_seq);

alter table public.ticks enable row level security;
alter table public.ticks force row level security;
create policy ticks_select_own on public.ticks for select to authenticated
  using (user_id = (select auth.uid()));
create policy ticks_insert_own on public.ticks for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy ticks_update_own on public.ticks for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.ticks from anon, authenticated;
grant select, insert, update on public.ticks to authenticated;
