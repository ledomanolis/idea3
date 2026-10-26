-- =========================================================================
-- Plans and replies
-- Run this in the Supabase SQL Editor (New query -> paste -> Run).
-- =========================================================================

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue_name text,
  venue_address text,
  venue_url text,
  notes text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists plans_group_starts on public.plans (group_id, starts_at);

create table if not exists public.plan_responses (
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  response text not null check (response in ('in', 'maybe', 'out')),
  updated_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);

-- Is the signed-in user in the group this plan belongs to?
create or replace function public.is_plan_member(p_plan_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.plans p
    join public.group_members m on m.group_id = p.group_id
    where p.id = p_plan_id and m.user_id = auth.uid()
  );
$$;

alter table public.plans enable row level security;
alter table public.plan_responses enable row level security;

create policy "members see their groups' plans"
  on public.plans for select to authenticated
  using (public.is_group_member(group_id));

create policy "members propose plans"
  on public.plans for insert to authenticated
  with check (created_by = auth.uid() and public.is_group_member(group_id));

create policy "creator or group owner edits a plan"
  on public.plans for update to authenticated
  using (created_by = auth.uid() or public.is_group_owner(group_id));

create policy "creator or group owner cancels a plan"
  on public.plans for delete to authenticated
  using (created_by = auth.uid() or public.is_group_owner(group_id));

create policy "members see replies"
  on public.plan_responses for select to authenticated
  using (public.is_plan_member(plan_id));

create policy "members reply for themselves"
  on public.plan_responses for insert to authenticated
  with check (user_id = auth.uid() and public.is_plan_member(plan_id));

create policy "members change their reply"
  on public.plan_responses for update to authenticated
  using (user_id = auth.uid());

create policy "members remove their reply"
  on public.plan_responses for delete to authenticated
  using (user_id = auth.uid());
