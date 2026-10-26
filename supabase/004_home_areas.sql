-- =========================================================================
-- Home areas
-- Run this in the Supabase SQL Editor (New query -> paste -> Run).
--
-- Each person's rough home area (a postcode or neighbourhood), used to find
-- venues that are fair for everyone to get to. Coordinates are rounded to
-- about 1 km. Only the owner can read their row; the app works out
-- distances on the server and never sends anyone's location to friends.
-- =========================================================================

create table if not exists public.home_areas (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  label text not null,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now()
);

alter table public.home_areas enable row level security;

create policy "users read their own home area"
  on public.home_areas for select to authenticated
  using (user_id = auth.uid());

create policy "users add their own home area"
  on public.home_areas for insert to authenticated
  with check (user_id = auth.uid());

create policy "users change their own home area"
  on public.home_areas for update to authenticated
  using (user_id = auth.uid());

create policy "users remove their own home area"
  on public.home_areas for delete to authenticated
  using (user_id = auth.uid());
