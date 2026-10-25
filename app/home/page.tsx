import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="doc">
      <div className="doc-head">
        <h1>Idea3</h1>
      </div>
      <p>
        Signed in as <b>{user?.email}</b>.
      </p>
      <form action="/auth/signout" method="post">
        <button className="btn" type="submit">
          Sign out
        </button>
      </form>
    </div>
  );
}
