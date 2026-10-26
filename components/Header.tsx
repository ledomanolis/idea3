import Link from "next/link";

// Top bar shown on every signed-in page.
export default function Header() {
  return (
    <header className="app-bar">
      <Link href="/home" className="app-bar-title">
        The Groupchat
      </Link>
      <div className="app-bar-actions">
        <Link href="/settings" className="btn small on-brand">
          Me
        </Link>
        <form action="/auth/signout" method="post">
          <button className="btn small on-brand" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
