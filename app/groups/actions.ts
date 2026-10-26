"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createGroup(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // The id is made here rather than read back after the insert: the creator
  // only becomes a member (and so can read the group) once the insert's
  // trigger has run.
  const id = crypto.randomUUID();
  const { error } = await supabase.from("groups").insert({ id, name, created_by: user!.id });
  if (error) throw new Error(error.message);

  revalidatePath("/home");
  redirect(`/groups/${id}`);
}

export async function joinGroup(formData: FormData) {
  const code = String(formData.get("code") || "");
  const supabase = createClient();
  const { data, error } = await supabase.rpc("join_group", { p_code: code });
  if (error || !data) throw new Error(error?.message || "Could not join group");

  revalidatePath("/home");
  redirect(`/groups/${data}`);
}

export async function leaveGroup(formData: FormData) {
  const groupId = String(formData.get("groupId") || "");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", user!.id);

  revalidatePath("/home");
  redirect("/home");
}

export async function removeMember(formData: FormData) {
  const groupId = String(formData.get("groupId") || "");
  const userId = String(formData.get("userId") || "");
  const supabase = createClient();
  await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
  revalidatePath(`/groups/${groupId}`);
}

export async function deleteGroup(formData: FormData) {
  const groupId = String(formData.get("groupId") || "");
  const supabase = createClient();
  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) throw new Error(error.message);

  revalidatePath("/home");
  redirect("/home");
}
