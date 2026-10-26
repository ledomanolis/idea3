-- =========================================================================
-- Booking details on plans
-- Run this in the Supabase SQL Editor (New query -> paste -> Run).
-- =========================================================================

alter table public.plans add column if not exists venue_website text;
alter table public.plans add column if not exists venue_phone text;
alter table public.plans add column if not exists venue_reservable boolean;
alter table public.plans add column if not exists booked_by uuid references public.profiles(id) on delete set null;
alter table public.plans add column if not exists booked_at timestamptz;
alter table public.plans add column if not exists booking_note text;

-- Anyone in the group can mark a plan as booked (or undo it), even though
-- only the creator or group owner can edit the rest of the plan.
create or replace function public.set_plan_booking(p_plan_id uuid, p_booked boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_plan_member(p_plan_id) then
    raise exception 'Not in this group';
  end if;

  if p_booked then
    update public.plans
    set booked_by = auth.uid(), booked_at = now(), booking_note = nullif(trim(p_note), '')
    where id = p_plan_id;
  else
    update public.plans
    set booked_by = null, booked_at = null, booking_note = null
    where id = p_plan_id;
  end if;
end;
$$;
