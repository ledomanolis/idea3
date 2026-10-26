"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    // Kept in a cookie rather than the email link, because Supabase only
    // sends people back to the exact callback address it allows.
    const next = new URLSearchParams(window.location.search).get("next");
    document.cookie = `after_login=${encodeURIComponent(next || "")}; path=/; max-age=3600; samesite=lax`;

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="auth-page">
      <h1 className="auth-title">The Groupchat</h1>
      <div className="auth-card">
      <h2>Sign in</h2>
      <p>
        No password needed —
        we&apos;ll email you a one-time link.
      </p>

      {status === "sent" ? (
        <div className="auth-sent">
          Check <b>{email}</b> for a sign-in link. You can close this tab once you&apos;ve
          clicked it.
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          {status === "error" && (
            <p style={{ color: "var(--brick)", fontSize: 13, marginBottom: 12 }}>{errorMsg}</p>
          )}
          <button className="btn primary" type="submit" disabled={status === "sending"} style={{ width: "100%" }}>
            {status === "sending" ? "Sending link…" : "Send sign-in link"}
          </button>
        </form>
      )}
      </div>
    </div>
  );
}
