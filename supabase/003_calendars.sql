-- =========================================================================
-- Calendar links
-- Run this in the Supabase SQL Editor (New query -> paste -> Run).
--
-- Each person's private calendar subscription link. These are secret, so
-- only their owner can read them; the app reads everyone's on the server
-- (with the service role key) and only ever passes on busy times.
-- =========================================================================

create table if not exists public.calendar_links (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  url text not null,
  updated_at timestamptz not null default now()
);

alter table public.calendar_links enable row level security;

create policy "users read their own calendar link"
  on public.calendar_links for select to authenticated
  using (user_id = auth.uid());

create policy "users add their own calendar link"
  on public.calendar_links for insert to authenticated
  with check (user_id = auth.uid());

create policy "users change their own calendar link"
  on public.calendar_links for update to authenticated
  using (user_id = auth.uid());

create policy "users remove their own calendar link"
  on public.calendar_links for delete to authenticated
  using (user_id = auth.uid());
