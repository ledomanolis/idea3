"use client";

import { useState } from "react";
import Link from "next/link";

type Member = { id: string; name: string; status: "linked" | "missing" | "broken"; busy: [number, number][] };

type Option = { start: number; end: number; free: Member[]; busy: Member[] };

const STEP = 30 * 60 * 1000; // try start times every half hour

const WINDOWS: Record<string, { label: string; from: number; to: number }> = {
  evening: { label: "Evenings (6pm–11pm)", from: 18, to: 23 },
  day: { label: "Daytime (10am–6pm)", from: 10, to: 18 },
  any: { label: "Any time (9am–11pm)", from: 9, to: 23 },
};

function isFree(m: Member, start: number, end: number) {
  return !m.busy.some(([s, e]) => s < end && e > start);
}

// For each day, finds the stretches inside the chosen window where the
// most people are free for at least `hours`. Works in the viewer's own
// time zone, so "evening" means evening wherever they are.
function findOptions(members: Member[], from: number, windowKey: string, hours: number, weekendsOnly: boolean) {
  const linked = members.filter((m) => m.status === "linked");
  const win = WINDOWS[windowKey];
  const length = hours * 60 * 60 * 1000;
  const days: Option[] = [];

  for (let d = 0; d < 14; d++) {
    const day = new Date(from);
    day.setDate(day.getDate() + d);
    const dow = day.getDay();
    if (weekendsOnly && dow !== 0 && dow !== 6 && dow !== 5) continue; // Fri–Sun

    // The weekend starts on Friday evening: people are at work during the day.
    const startHour = weekendsOnly && dow === 5 ? Math.max(win.from, 18) : win.from;
    const winStart = new Date(day).setHours(startHour, 0, 0, 0);
    const winEnd = new Date(day).setHours(win.to, 0, 0, 0);

    let best: Option | null = null;
    for (let s = Math.max(winStart, Math.ceil(from / STEP) * STEP); s + length <= winEnd; s += STEP) {
      const free = linked.filter((m) => isFree(m, s, s + length));
      if (!best || free.length > best.free.length) {
        best = { start: s, end: s + length, free, busy: linked.filter((m) => !free.includes(m)) };
      } else if (
        best.end === s - STEP + length &&
        free.length === best.free.length &&
        free.every((m) => best!.free.includes(m))
      ) {
        // Same people free half an hour later too — widen the stretch.
        best.end = s + length;
      }
    }
    if (best && best.free.length > 0) days.push(best);
  }

  const top = Math.max(0, ...days.map((o) => o.free.length));
  return days
    .filter((o) => o.free.length === top)
    .concat(days.filter((o) => o.free.length !== top).sort((a, b) => b.free.length - a.free.length))
    .slice(0, 6);
}

function formatOption(o: Option) {
  const day = new Date(o.start).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  const time = (t: number) =>
    new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).replace(":00", "");
  return { day, time: `${time(o.start)} – ${time(o.end)}` };
}

export default function FindTime({
  groupId,
  onPick,
  pickedStart,
}: {
  groupId: string;
  onPick?: (start: number, end: number) => void;
  pickedStart?: number | null;
}) {
  const [windowKey, setWindowKey] = useState("evening");
  const [hours, setHours] = useState(2);
  const [weekendsOnly, setWeekendsOnly] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [members, setMembers] = useState<Member[]>([]);
  const [options, setOptions] = useState<Option[]>([]);

  async function search() {
    setState("loading");
    try {
      const res = await fetch(`/api/groups/${groupId}/busy`);
      if (!res.ok) throw new Error();
      const data: { from: number; members: Member[] } = await res.json();
      setMembers(data.members);
      setOptions(findOptions(data.members, data.from, windowKey, hours, weekendsOnly));
      setState("done");
    } catch {
      setState("error");
    }
  }

  const linked = members.filter((m) => m.status === "linked");
  const notLinked = members.filter((m) => m.status !== "linked");

  return (
    <div className="panel">
      <div className="field-row">
        <div className="field">
          <label htmlFor="window">When?</label>
          <select id="window" value={windowKey} onChange={(e) => setWindowKey(e.target.value)}>
            {Object.entries(WINDOWS).map(([k, w]) => (
              <option key={k} value={k}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="hours">How long?</label>
          <select id="hours" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            {[1, 2, 3, 4].map((h) => (
              <option key={h} value={h}>
                {h} {h === 1 ? "hour" : "hours"}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="check">
        <input type="checkbox" checked={weekendsOnly} onChange={(e) => setWeekendsOnly(e.target.checked)} />
        Weekends only (Friday night–Sunday)
      </label>

      <div className="btn-row">
        <button className="btn primary" type="button" onClick={search} disabled={state === "loading"}>
          {state === "loading" ? "Checking calendars…" : "Find a time!"}
        </button>
      </div>

      {state === "error" && <div className="alert">Couldn&apos;t check calendars just now. Try again in a minute.</div>}

      {state === "done" && (
        <div className="results">
          {linked.length === 0 ? (
            <div className="alert">
              Nobody in this group has linked a calendar yet. <Link href="/settings">Link yours</Link> and ask your
              friends to do the same.
            </div>
          ) : options.length === 0 ? (
            <div className="alert">No free times found in the next two weeks. Try a shorter plan or a different time of day.</div>
          ) : (
            options.map((o) => {
              const { day, time } = formatOption(o);
              const everyone = o.busy.length === 0;
              return (
                <div className={`option ${everyone ? "everyone" : ""}`} key={o.start}>
                  <div>
                    <div className="option-day">{day}</div>
                    <div className="option-time">{time}</div>
                  </div>
                  <div className="option-who">
                    {everyone ? (
                      <span className="pow">Everyone free!</span>
                    ) : (
                      <>
                        <b>
                          {o.free.length} of {linked.length} free
                        </b>
                        <span className="sub">Busy: {o.busy.map((m) => m.name).join(", ")}</span>
                      </>
                    )}
                    {onPick && (
                      <button
                        className={`btn small pick ${pickedStart === o.start ? "picked" : ""}`}
                        type="button"
                        onClick={() => onPick(o.start, o.end)}
                      >
                        {pickedStart === o.start ? "Picked ✓" : "Pick"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {notLinked.length > 0 && (
            <p className="block-note" style={{ marginTop: 12 }}>
              Not included (no calendar linked): {notLinked.map((m) => m.name).join(", ")}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
