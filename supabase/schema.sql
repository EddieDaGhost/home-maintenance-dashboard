-- ===========================================================================
-- Home Maintenance — shared household sync
--
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query
-- → paste → Run). It is safe to run again; everything is "if not exists" or
-- "create or replace".
--
-- The security model, in one paragraph:
--
--   There are no user accounts. A household is a random UUID plus a random
--   key, and knowing both is what grants access — the same idea as an unguessable
--   share link. Row Level Security is enabled on every table with NO policies,
--   so the public `anon` role cannot read or write any table directly. All
--   access goes through the two SECURITY DEFINER functions at the bottom, which
--   check the key before doing anything. That way a leaked anon key on its own
--   gets you precisely nothing.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.households (
  id         uuid primary key default gen_random_uuid(),
  key        text        not null,
  created_at timestamptz not null default now()
);

-- Completions are append-only events. The primary key is the natural one:
-- the same task logged at the same instant is the same event, no matter which
-- phone reports it. That is what makes syncing idempotent — a device can push
-- the same completion a hundred times and the row count never changes.
create table if not exists public.completions (
  household_id uuid        not null references public.households (id) on delete cascade,
  task_id      text        not null,
  at           timestamptz not null,
  by           text,
  primary key (household_id, task_id, at)
);

-- Rooms, custom names and the household roster travel together as one document.
-- These are settings rather than events, so the newest write wins.
create table if not exists public.household_state (
  household_id uuid primary key references public.households (id) on delete cascade,
  doc          jsonb       not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Lock the tables. No policies are defined on purpose: with RLS on and no
-- policy, PostgREST returns nothing to `anon` no matter what it asks for.
-- ---------------------------------------------------------------------------

alter table public.households      enable row level security;
alter table public.completions     enable row level security;
alter table public.household_state enable row level security;

-- ---------------------------------------------------------------------------
-- The only two doors in.
-- ---------------------------------------------------------------------------

-- Create a household. The caller invents the key; we hand back the id.
create or replace function public.hm_create_household(p_key text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_key is null or length(p_key) < 24 then
    raise exception 'key must be at least 24 characters';
  end if;

  insert into public.households (key) values (p_key) returning id into v_id;
  return v_id;
end;
$$;

-- Push what this device has, get back everything the household has.
--
-- Completions merge by union — nothing is ever deleted, and two phones logging
-- offline simply both arrive. The state document is last-write-wins, guarded by
-- its timestamp so a stale device can't overwrite newer settings.
create or replace function public.hm_sync(
  p_household         uuid,
  p_key               text,
  p_events            jsonb default '[]'::jsonb,
  p_state             jsonb default null,
  p_state_updated_at  timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc     jsonb;
  v_updated timestamptz;
begin
  perform 1 from public.households
   where id = p_household and key = p_key;
  if not found then
    raise exception 'unknown household';
  end if;

  if p_events is not null and jsonb_typeof(p_events) = 'array' then
    insert into public.completions (household_id, task_id, at, by)
    select p_household,
           e ->> 'task_id',
           (e ->> 'at')::timestamptz,
           nullif(e ->> 'by', '')
      from jsonb_array_elements(p_events) as e
     where e ? 'task_id' and e ? 'at'
    on conflict (household_id, task_id, at) do nothing;
  end if;

  if p_state is not null then
    insert into public.household_state (household_id, doc, updated_at)
    values (p_household, p_state, coalesce(p_state_updated_at, now()))
    on conflict (household_id) do update
       set doc        = excluded.doc,
           updated_at = excluded.updated_at
     where public.household_state.updated_at < excluded.updated_at;
  end if;

  select doc, updated_at
    into v_doc, v_updated
    from public.household_state
   where household_id = p_household;

  return jsonb_build_object(
    'completions', coalesce(
      (select jsonb_agg(jsonb_build_object('task_id', task_id, 'at', at, 'by', by))
         from public.completions
        where household_id = p_household),
      '[]'::jsonb
    ),
    'state', coalesce(v_doc, '{}'::jsonb),
    'state_updated_at', v_updated
  );
end;
$$;

-- The public role may call these two functions and nothing else.
revoke all on function public.hm_create_household(text) from public;
revoke all on function public.hm_sync(uuid, text, jsonb, jsonb, timestamptz) from public;

grant execute on function public.hm_create_household(text) to anon, authenticated;
grant execute on function public.hm_sync(uuid, text, jsonb, jsonb, timestamptz) to anon, authenticated;
