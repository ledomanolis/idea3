import type { SupabaseClient } from "@supabase/supabase-js";

export type PlanResponse = "in" | "maybe" | "out";

export type Plan = {
  id: string;
  group_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  venue_name: string | null;
  venue_address: string | null;
  venue_url: string | null;
  venue_website: string | null;
  venue_phone: string | null;
  venue_reservable: boolean | null;
  booked_by: string | null;
  booking_note: string | null;
  bookerName: string | null;
  notes: string | null;
  created_by: string;
  groupName?: string;
  responses: { user_id: string; response: PlanResponse; name: string }[];
};

// Plans that haven't finished yet (a plan stays up until a few hours after
// it starts), soonest first, with everyone's replies. RLS limits this to
// the signed-in user's groups.
export async function upcomingPlans(supabase: SupabaseClient, groupId?: string): Promise<Plan[]> {
  const since = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  let query = supabase
    .from("plans")
    .select(
      "*, groups(name), booker:profiles!plans_booked_by_fkey(email, full_name), plan_responses(user_id, response, profiles(email, full_name))"
    )
    .gte("starts_at", since)
    .order("starts_at", { ascending: true });
  if (groupId) query = query.eq("group_id", groupId);

  const { data, error } = await query;
  if (error) console.error("upcomingPlans", error);
  return (data || []).map((p: any) => ({
    ...p,
    groupName: p.groups?.name,
    bookerName: p.booker ? p.booker.full_name || p.booker.email?.split("@")[0] || "Someone" : null,
    responses: (p.plan_responses || []).map((r: any) => ({
      user_id: r.user_id,
      response: r.response,
      name: r.profiles?.full_name || r.profiles?.email?.split("@")[0] || "Someone",
    })),
  }));
}

// Pages are drawn on Vercel's servers (which run on UTC), so times are
// shown in UK time explicitly. Revisit if groups outside the UK join.
const TIME_ZONE = "Europe/London";

export function formatPlanTime(startsAt: string, endsAt: string | null) {
  const start = new Date(startsAt);
  const day = start.toLocaleDateString("en-GB", { timeZone: TIME_ZONE, weekday: "short", day: "numeric", month: "short" });
  const time = (d: Date) =>
    d.toLocaleTimeString("en-GB", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit", hour12: true }).replace(":00", "").replace(" ", "");
  return { day, time: endsAt ? `${time(start)} – ${time(new Date(endsAt))}` : time(start) };
}
