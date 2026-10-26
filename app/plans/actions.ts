"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const text = (formData: FormData, key: string) => String(formData.get(key) || "").trim() || null;

// Returns an error message for PlanMaker to show, rather than throwing,
// so the person sees what went wrong.
export async function createPlan(formData: FormData): Promise<{ error?: string }> {
  const groupId = String(formData.get("groupId") || "");
  const title = text(formData, "title");
  const startsAt = text(formData, "startsAt");
  if (!title || !startsAt) return { error: "The plan needs a name and a start time." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You've been signed out. Refresh the page and sign in again." };

  // Made here rather than read back: see createGroup for why.
  const id = crypto.randomUUID();
  const { error } = await supabase.from("plans").insert({
    id,
    group_id: groupId,
    title,
    starts_at: startsAt,
    ends_at: text(formData, "endsAt"),
    venue_name: text(formData, "venueName"),
    venue_address: text(formData, "venueAddress"),
    venue_url: text(formData, "venueUrl"),
    notes: text(formData, "notes"),
    created_by: user.id,
  });
  if (error) {
    console.error("createPlan", error);
    return { error: error.message };
  }

  // Whoever suggests it is going.
  const { error: replyError } = await supabase
    .from("plan_responses")
    .insert({ plan_id: id, user_id: user.id, response: "in" });
  if (replyError) console.error("createPlan reply", replyError);

  // No redirect: PlanMaker stays on the page, clears itself and scrolls up
  // to the refreshed list of plans.
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/home");
  return {};
}

export async function respondToPlan(formData: FormData) {
  const planId = String(formData.get("planId") || "");
  const response = String(formData.get("response") || "");
  if (!["in", "maybe", "out"].includes(response)) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("plan_responses")
    .upsert({ plan_id: planId, user_id: user!.id, response, updated_at: new Date().toISOString() });

  revalidatePath("/groups/[id]", "page");
  revalidatePath("/home");
}

export async function cancelPlan(formData: FormData) {
  const planId = String(formData.get("planId") || "");
  const supabase = createClient();
  const { error } = await supabase.from("plans").delete().eq("id", planId);
  if (error) throw new Error(error.message);

  revalidatePath("/groups/[id]", "page");
  revalidatePath("/home");
}
