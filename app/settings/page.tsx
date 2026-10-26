import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import { saveName, saveCalendar, removeCalendar, saveHomeArea, removeHomeArea } from "@/app/settings/actions";

const ERRORS: Record<string, string> = {
  format: "That doesn't look like a calendar link. It should start with https:// or webcal://.",
  fetch: "Couldn't read a calendar from that link. Check it's the private/public subscription link, not the normal calendar web page.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string; events?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: link }, { data: home }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle(),
    supabase.from("calendar_links").select("url, updated_at").eq("user_id", user!.id).maybeSingle(),
    supabase.from("home_areas").select("label").eq("user_id", user!.id).maybeSingle(),
  ]);

  return (
    <>
      <Header />
      <div className="doc">
        <div className="doc-head">
          <h2>My settings</h2>
        </div>

        <section className="block">
          <h3>Your name</h3>
          <p className="block-note">What your friends see in groups.</p>
          <form action={saveName}>
            <div className="field">
              <input name="name" type="text" defaultValue={profile?.full_name || ""} placeholder="e.g. Ledo" />
            </div>
            <div className="btn-row">
              <button className="btn primary small" type="submit">
                Save name
              </button>
              {searchParams.saved === "name" && <span className="saved-note">Saved!</span>}
            </div>
          </form>
        </section>

        <section className="block">
          <h3>Home area</h3>
          <p className="block-note">
            A postcode or neighbourhood, so groups can pick places that are easy for everyone to get to.
            Friends never see it — the app only uses it to work out distances.
          </p>
          {searchParams.error === "maps" && (
            <div className="alert">Google Maps isn&apos;t connected properly yet, so areas can&apos;t be looked up.</div>
          )}
          {searchParams.error === "area" && (
            <div className="alert">Couldn&apos;t find that area. Try a full postcode like SW6 4LU, or a place like &quot;Clapham&quot;.</div>
          )}
          {home ? (
            <div className="invite-box">
              <code>{home.label} ✓</code>
              {searchParams.saved === "area" && <span className="saved-note">Saved!</span>}
              <form action={removeHomeArea}>
                <button className="btn danger" type="submit">
                  Change
                </button>
              </form>
            </div>
          ) : (
            <form action={saveHomeArea}>
              <div className="field">
                <input name="area" type="text" required placeholder="e.g. SW6 4LU or Clapham" />
              </div>
              <button className="btn primary small" type="submit">
                Save area
              </button>
            </form>
          )}
        </section>

        <section className="block">
          <h3>My calendar</h3>
          <p className="block-note">
            Link your calendar so groups can find a time you&apos;re free. Your friends only ever see
            when you&apos;re busy — never what your events are.
          </p>

          {searchParams.error && searchParams.error !== "area" && searchParams.error !== "maps" &&<div className="alert">{ERRORS[searchParams.error] || "Something went wrong."}</div>}
          {searchParams.saved === "calendar" && (
            <div className="alert ok">
              Calendar linked! Found {searchParams.events || 0} busy{" "}
              {searchParams.events === "1" ? "time" : "times"} in the next two weeks.
            </div>
          )}

          {link ? (
            <div className="invite-box">
              <code>Calendar linked ✓</code>
              <form action={removeCalendar}>
                <button className="btn danger" type="submit">
                  Unlink
                </button>
              </form>
            </div>
          ) : (
            <form action={saveCalendar}>
              <div className="field">
                <label htmlFor="url">Calendar link</label>
                <input id="url" name="url" type="text" required placeholder="webcal://... or https://...ics" />
              </div>
              <button className="btn primary" type="submit">
                Link calendar
              </button>
            </form>
          )}
        </section>

        <section className="block">
          <h3>Where do I find my link?</h3>
          <hr className="rule" />
          <details className="howto">
            <summary>Apple Calendar (iPhone)</summary>
            <ol>
              <li>Open the <b>Calendar</b> app and tap <b>Calendars</b> at the bottom.</li>
              <li>Tap the <b>ⓘ</b> next to the calendar you use most.</li>
              <li>Turn on <b>Public Calendar</b>, then tap <b>Share Link…</b> → <b>Copy</b>.</li>
              <li>Paste it above. Anyone with the link could see that calendar, so only share it here.</li>
            </ol>
          </details>
          <details className="howto">
            <summary>Google Calendar</summary>
            <ol>
              <li>On a computer, open <b>calendar.google.com</b> → ⚙️ <b>Settings</b>.</li>
              <li>On the left, click your calendar under <b>Settings for my calendars</b>.</li>
              <li>Scroll to <b>Integrate calendar</b> and copy <b>Secret address in iCal format</b>.</li>
            </ol>
          </details>
          <details className="howto">
            <summary>Outlook</summary>
            <ol>
              <li>In Outlook on the web, go to ⚙️ <b>Settings → Calendar → Shared calendars</b>.</li>
              <li>Under <b>Publish a calendar</b>, pick your calendar and <b>Can view when I&apos;m busy</b>, then <b>Publish</b>.</li>
              <li>Copy the <b>ICS</b> link.</li>
            </ol>
          </details>
        </section>
      </div>
    </>
  );
}
