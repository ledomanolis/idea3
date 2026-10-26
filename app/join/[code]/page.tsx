import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { joinGroup } from "@/app/groups/actions";

export default async function JoinPage({ params }: { params: { code: string } }) {
  const supabase = createClient();
  const { data } = await supabase.rpc("group_for_invite", { p_code: params.code });
  const group = (data as { id: string; name: string; member_count: number }[] | null)?.[0];

  if (group) {
    // Already a member? Go straight to the group.
    const { data: own } = await supabase.from("groups").select("id").eq("id", group.id).maybeSingle();
    if (own) redirect(`/groups/${group.id}`);
  }

  return (
    <div className="auth-page">
      <h1 className="auth-title">The Groupchat</h1>
      <div className="auth-card">
        {group ? (
          <>
            <h2>Join {group.name}</h2>
            <p>
              You&apos;ve been invited to a group with {group.member_count}{" "}
              {group.member_count === 1 ? "member" : "members"}.
            </p>
            <form action={joinGroup}>
              <input type="hidden" name="code" value={params.code} />
              <button className="btn primary" type="submit" style={{ width: "100%" }}>
                Join group
              </button>
            </form>
          </>
        ) : (
          <>
            <h2>Link not found</h2>
            <p>This invite link doesn&apos;t work any more. Ask your friend to send a new one.</p>
            <Link href="/home" className="btn">
              Go to your groups
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
