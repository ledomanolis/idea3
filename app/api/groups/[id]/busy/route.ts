import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchBusy, type Busy } from "@/lib/calendar";

export const dynamic = "force-dynamic";

const DAYS_AHEAD = 15;

// Busy times for everyone in a group, for the "Find a time" box. Only
// start/end times leave the server, never event names or calendar links.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
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
  const { data: links } = await admin.from("calendar_links").select("user_id, url").in("user_id", ids);

  const from = new Date();
  const to = new Date(from.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);

  const result = await Promise.all(
    (members || []).map(async (m) => {
      const profile = m.profiles as unknown as { email: string; full_name: string | null } | null;
      const name = profile?.full_name || profile?.email?.split("@")[0] || "Someone";
      const link = (links || []).find((l) => l.user_id === m.user_id);

      let status: "linked" | "missing" | "broken" = link ? "linked" : "missing";
      let busy: Busy[] = [];
      if (link) {
        try {
          busy = await fetchBusy(link.url, from, to);
        } catch {
          status = "broken";
        }
      }
      return { id: m.user_id, name, status, busy };
    })
  );

  return NextResponse.json({ from: from.getTime(), members: result });
}
