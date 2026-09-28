-- Foundation only: apply to the dedicated Sintonizze project after selection.
-- Preserve the complete v4.2 document, including unknown fields and local IDs.
create table public.sintonizze_members (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.sintonizze_members enable row level security;
revoke all on public.sintonizze_members from public, anon, authenticated;
grant select on public.sintonizze_members to authenticated;
create policy member_self on public.sintonizze_members for select to authenticated
  using (user_id = (select auth.uid()));

create table public.sintonizze_snapshots (
  owner_id uuid not null references auth.users(id) on delete cascade,
  revision integer not null check (revision > 0),
  schema_version integer not null default 1 check (schema_version = 1),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, revision),
  constraint valid_document check (
    jsonb_typeof(payload) = 'object'
    and coalesce(jsonb_typeof(payload->'protocols') = 'array', false)
    and coalesce(jsonb_typeof(payload->'sessions') = 'array', false)
    and coalesce(jsonb_typeof(payload->'templates') = 'array', false)
    and octet_length(payload::text) <= 2097152
  )
);
alter table public.sintonizze_snapshots enable row level security;
revoke all on public.sintonizze_snapshots from public, anon, authenticated;
grant select, insert on public.sintonizze_snapshots to authenticated;
create policy snapshots_read on public.sintonizze_snapshots for select to authenticated
  using (owner_id = (select auth.uid()) and exists (
    select 1 from public.sintonizze_members where user_id = (select auth.uid())
  ));
create policy snapshots_create on public.sintonizze_snapshots for insert to authenticated
  with check (owner_id = (select auth.uid()) and exists (
    select 1 from public.sintonizze_members where user_id = (select auth.uid())
  ));

-- Also guards direct PostgREST inserts. Two writers for the same revision
-- cannot both succeed: the primary key serializes the conflict.
create function public.sintonizze_check_revision() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare current_revision integer;
begin
  select coalesce(max(revision), 0) into current_revision
    from public.sintonizze_snapshots where owner_id = new.owner_id;
  if new.revision <> current_revision + 1 then
    raise exception 'SINTONIZZE_CONFLICT' using errcode = '40001';
  end if;
  new.created_at := now();
  return new;
end;
$$;
revoke all on function public.sintonizze_check_revision() from public, anon, authenticated;
create trigger snapshot_revision before insert on public.sintonizze_snapshots
  for each row execute function public.sintonizze_check_revision();

create function public.sintonizze_save_snapshot(expected_revision integer, document jsonb)
returns setof public.sintonizze_snapshots
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if expected_revision is null or expected_revision < 0 then
    raise exception 'Invalid revision' using errcode = '22023';
  end if;
  return query insert into public.sintonizze_snapshots(owner_id, revision, payload)
    values (auth.uid(), expected_revision + 1, document) returning *;
exception when unique_violation then
  raise exception 'SINTONIZZE_CONFLICT' using errcode = '40001';
end;
$$;
revoke all on function public.sintonizze_save_snapshot(integer, jsonb) from public, anon;
grant execute on function public.sintonizze_save_snapshot(integer, jsonb) to authenticated;
