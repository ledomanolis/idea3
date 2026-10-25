import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Called once a day by a Vercel cron job (see vercel.json). Supabase's free
// plan pauses a project after about a week without activity; this small
// query keeps it awake. Row-level security means it returns no data.
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const { error } = await supabase.from("profiles").select("id").limit(1);
  return NextResponse.json({ ok: !error });
}
