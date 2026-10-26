import Link from "next/link";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = createClient();

  // RLS only returns groups this user is a member of.
  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, group_members(count)")
    .order("created_at", { ascending: false });

  return (
    <>
      <Header />
      <div className="doc">
        <div className="doc-head">
          <h2>Your groups</h2>
        </div>

        {(groups || []).length === 0 ? (
          <div className="empty-state">
            You&apos;re not in any groups yet. Make one and send your friends the invite link.
          </div>
        ) : (
          (groups || []).map((g) => {
            const count = (g.group_members as unknown as { count: number }[])[0]?.count ?? 0;
            return (
              <Link href={`/groups/${g.id}`} className="group-card" key={g.id}>
                <b>{g.name}</b>
                <span className="sub">
                  {count} {count === 1 ? "member" : "members"}
                </span>
              </Link>
            );
          })
        )}

        <div className="btn-row" style={{ marginTop: 20 }}>
          <Link href="/groups/new" className="btn primary">
            New group
          </Link>
        </div>
      </div>
    </>
  );
}
