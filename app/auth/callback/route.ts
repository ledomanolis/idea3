import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // The login page leaves the page they were heading to (e.g. an invite
  // link) in a cookie. Only follow paths on this site.
  const requested = decodeURIComponent(cookies().get("after_login")?.value ?? "");
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/home";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
