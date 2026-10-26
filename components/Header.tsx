import Link from "next/link";

// Top bar shown on every signed-in page.
export default function Header() {
  return (
    <header className="app-bar">
      <Link href="/home" className="app-bar-title">
        The Groupchat
      </Link>
      <form action="/auth/signout" method="post">
        <button className="btn small on-brand" type="submit">
          Sign out
        </button>
      </form>
    </header>
  );
}
