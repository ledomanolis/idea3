"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { fetchBusy, normaliseCalendarUrl } from "@/lib/calendar";
import { geocodeArea, type LatLng } from "@/lib/places";

async function currentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user: user! };
}

export async function saveName(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const { supabase, user } = await currentUser();
  await supabase.from("profiles").update({ full_name: name || null }).eq("id", user.id);
  revalidatePath("/settings");
  redirect("/settings?saved=name");
}

export async function saveCalendar(formData: FormData) {
  const url = normaliseCalendarUrl(String(formData.get("url") || ""));
  if (!url) redirect("/settings?error=format");

  // Check the link really is a calendar before saving it.
  const now = new Date();
  let count = 0;
  try {
    const busy = await fetchBusy(url!, now, new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000));
    count = busy.length;
  } catch {
    redirect("/settings?error=fetch");
  }

  const { supabase, user } = await currentUser();
  const { error } = await supabase
    .from("calendar_links")
    .upsert({ user_id: user.id, url, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  redirect(`/settings?saved=calendar&events=${count}`);
}

export async function saveHomeArea(formData: FormData) {
  const label = String(formData.get("area") || "").trim();
  if (!label) redirect("/settings?error=area");

  let point: LatLng | null = null;
  try {
    point = await geocodeArea(label);
  } catch (e) {
    // Most likely GOOGLE_MAPS_API_KEY is missing or not allowed to geocode.
    console.error(e);
    redirect("/settings?error=maps");
  }
  if (!point) redirect("/settings?error=area");

  const { supabase, user } = await currentUser();
  const { error } = await supabase
    .from("home_areas")
    .upsert({ user_id: user.id, label, lat: point!.lat, lng: point!.lng, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  redirect("/settings?saved=area");
}

export async function removeHomeArea() {
  const { supabase, user } = await currentUser();
  await supabase.from("home_areas").delete().eq("user_id", user.id);
  revalidatePath("/settings");
  redirect("/settings");
}

export async function removeCalendar() {
  const { supabase, user } = await currentUser();
  await supabase.from("calendar_links").delete().eq("user_id", user.id);
  revalidatePath("/settings");
  redirect("/settings");
}
