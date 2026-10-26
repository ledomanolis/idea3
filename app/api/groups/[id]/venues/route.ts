import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchVenues, midpoint, distanceKm, type LatLng } from "@/lib/places";

export const dynamic = "force-dynamic";

// Venue ideas near the middle of everyone in the group. Distances are
// worked out here so nobody's home area is ever sent to the browser.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "bar";
  const budget = searchParams.get("budget") || "any";

  // RLS means this only finds the group if the caller is a member.
  const supabase = createClient();
  const { data: group } = await supabase.from("groups").select("id").eq("id", params.id).maybeSingle();
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createAdminClient();
  const { data: members } = await admin
    .from("group_members")
    .select("user_id, profiles(email, full_name)")
    .eq("group_id", params.id);
  const ids = (members || []).map((m) => m.user_id);
  const { data: areas } = await admin.from("home_areas").select("user_id, lat, lng").in("user_id", ids);

  const people = (members || []).map((m) => {
    const profile = m.profiles as unknown as { email: string; full_name: string | null } | null;
    const area = (areas || []).find((a) => a.user_id === m.user_id);
    return {
      name: profile?.full_name || profile?.email?.split("@")[0] || "Someone",
      home: area ? ({ lat: area.lat, lng: area.lng } as LatLng) : null,
    };
  });
  const located = people.filter((p) => p.home);
  const missing = people.filter((p) => !p.home).map((p) => p.name);

  if (located.length === 0) return NextResponse.json({ venues: [], missing });

  const centre = midpoint(located.map((p) => p.home!));
  let venues;
  try {
    venues = await searchVenues(centre, type, budget);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Search failed" }, { status: 502 });
  }

  const result = venues
    .map((v) => {
      const trips = located.map((p) => ({ name: p.name, km: distanceKm(p.home!, v.location) }));
      const furthest = trips.reduce((a, b) => (b.km > a.km ? b : a));
      const average = trips.reduce((s, t) => s + t.km, 0) / trips.length;
      const { location, ...rest } = v;
      return { ...rest, average, furthest };
    })
    // Fairest first: the person with the longest trip has the shortest one.
    .sort((a, b) => a.furthest.km - b.furthest.km)
    .slice(0, 6);

  return NextResponse.json({ venues: result, missing });
}
