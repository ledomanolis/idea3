-- =========================================================================
-- Groups and invite links
-- Run this in the Supabase SQL Editor (New query -> paste -> Run).
-- =========================================================================

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Anyone with this code can join via /join/<code>.
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  -- Points at profiles (not auth.users) so the app can show members' names.
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- ---------------------------------------------------------------------
-- Membership helpers (security definer so they can be used inside RLS
-- policies on group_members itself without recursive-policy errors).
-- ---------------------------------------------------------------------
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_group_owner(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid() and role = 'owner'
  );
$$;

-- Auto-add the creator of a group as its owner.
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_group_created on public.groups;
create trigger on_group_created
  after insert on public.groups
  for each row execute function public.handle_new_group();

-- ---------------------------------------------------------------------
-- Invite links: look up a group's name from its code (before joining),
-- and join it. Both run as definer because a non-member can't read the
-- group directly.
-- ---------------------------------------------------------------------
create or replace function public.group_for_invite(p_code text)
returns table (id uuid, name text, member_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select g.id, g.name, (select count(*) from public.group_members m where m.group_id = g.id)
  from public.groups g
  where g.invite_code = p_code and auth.uid() is not null;
$$;

create or replace function public.join_group(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select id into v_group_id from public.groups where invite_code = p_code;
  if v_group_id is null then
    raise exception 'Invite link not found';
  end if;

  insert into public.group_members (group_id, user_id)
  values (v_group_id, auth.uid())
  on conflict do nothing;

  return v_group_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create policy "members read their groups"
  on public.groups for select to authenticated
  using (public.is_group_member(id));

create policy "signed-in users create groups"
  on public.groups for insert to authenticated
  with check (created_by = auth.uid());

create policy "owners rename groups"
  on public.groups for update to authenticated
  using (public.is_group_owner(id));

create policy "owners delete groups"
  on public.groups for delete to authenticated
  using (public.is_group_owner(id));

-- Joining only happens through join_group() and the new-group trigger,
-- so there is no insert policy on group_members.
create policy "members see who is in their groups"
  on public.group_members for select to authenticated
  using (public.is_group_member(group_id));

create policy "leave a group, or owners remove people"
  on public.group_members for delete to authenticated
  using (user_id = auth.uid() or public.is_group_owner(group_id));
