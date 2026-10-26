import { notFound } from "next/navigation";
import Header from "@/components/Header";
import CopyInvite from "@/components/CopyInvite";
import { createClient } from "@/lib/supabase/server";
import { leaveGroup, removeMember, deleteGroup } from "@/app/groups/actions";

export default async function GroupPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: group } = await supabase.from("groups").select("*").eq("id", params.id).single();
  if (!group) notFound();

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, role, profiles(email, full_name)")
    .eq("group_id", params.id)
    .order("joined_at", { ascending: true });

  const isOwner = (members || []).some((m) => m.user_id === user?.id && m.role === "owner");

  return (
    <>
      <Header />
      <div className="doc">
        <div className="doc-head">
          <h2>{group.name}</h2>
        </div>

        <section className="block">
          <h3>Invite friends</h3>
          <p className="block-note">Anyone with this link can join the group once they&apos;ve signed in.</p>
          <CopyInvite code={group.invite_code} />
        </section>

        <section className="block">
          <h3>Members</h3>
          <hr className="rule" />
          {(members || []).map((m) => {
            const profile = m.profiles as unknown as { email: string; full_name: string | null } | null;
            return (
              <div className="member-row" key={m.user_id}>
                <span>
                  {profile?.full_name || profile?.email || "Unknown"}
                  {m.user_id === user?.id && <span className="badge">you</span>}
                  {m.role === "owner" && <span className="badge">owner</span>}
                </span>
                {isOwner && m.user_id !== user?.id && (
                  <form action={removeMember}>
                    <input type="hidden" name="groupId" value={group.id} />
                    <input type="hidden" name="userId" value={m.user_id} />
                    <button className="btn danger" type="submit">
                      Remove
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </section>

        <div className="btn-row">
          <form action={leaveGroup}>
            <input type="hidden" name="groupId" value={group.id} />
            <button className="btn" type="submit">
              Leave group
            </button>
          </form>
          {isOwner && (
            <form action={deleteGroup}>
              <input type="hidden" name="groupId" value={group.id} />
              <button className="btn danger" type="submit">
                Delete group
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
