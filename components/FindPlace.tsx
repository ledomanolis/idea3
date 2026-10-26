"use client";

import { useState } from "react";
import Link from "next/link";

type Venue = {
  id: string;
  name: string;
  kind: string;
  address: string;
  rating: number | null;
  ratingCount: number;
  price: string | null;
  mapsUrl: string;
  average: number;
  furthest: { name: string; km: number };
};

// Kept in step with PLAN_TYPES and BUDGETS in lib/places.ts.
const TYPES: [string, string][] = [
  ["bar", "Drinks"],
  ["restaurant", "Dinner"],
  ["brunch", "Brunch"],
  ["coffee", "Coffee"],
  ["activity", "Activity"],
];
const BUDGETS: [string, string][] = [
  ["any", "Any budget"],
  ["low", "£ — cheap and cheerful"],
  ["mid", "££ — mid-range"],
  ["high", "£££ — treat yourself"],
];

const km = (n: number) => (n < 1 ? `${Math.round(n * 1000)} m` : `${n.toFixed(1)} km`);

export default function FindPlace({ groupId }: { groupId: string }) {
  const [type, setType] = useState("bar");
  const [budget, setBudget] = useState("mid");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [missing, setMissing] = useState<string[]>([]);

  async function search() {
    setState("loading");
    try {
      const res = await fetch(`/api/groups/${groupId}/venues?type=${type}&budget=${budget}`);
      if (!res.ok) throw new Error();
      const data: { venues: Venue[]; missing: string[] } = await res.json();
      setVenues(data.venues);
      setMissing(data.missing);
      setState("done");
    } catch {
      setState("error");
    }
  }

  const noPrices = type === "coffee" || type === "activity";

  return (
    <div className="panel">
      <div className="field-row">
        <div className="field">
          <label htmlFor="type">What kind of plan?</label>
          <select id="type" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="budget">Budget per head</label>
          <select id="budget" value={budget} onChange={(e) => setBudget(e.target.value)} disabled={noPrices}>
            {BUDGETS.map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="btn-row">
        <button className="btn primary" type="button" onClick={search} disabled={state === "loading"}>
          {state === "loading" ? "Searching…" : "Find a place!"}
        </button>
      </div>

      {state === "error" && <div className="alert">Couldn&apos;t search for places just now. Try again in a minute.</div>}

      {state === "done" && (
        <div className="results">
          {venues.length === 0 && missing.length > 0 && (
            <div className="alert">
              Nobody in this group has added a home area yet. <Link href="/settings">Add yours</Link> and ask your
              friends to do the same.
            </div>
          )}
          {venues.length === 0 && missing.length === 0 && (
            <div className="alert">No places found. Try a different kind of plan or budget.</div>
          )}

          {venues.map((v) => (
            <a className="venue" href={v.mapsUrl} target="_blank" rel="noreferrer" key={v.id}>
              <div className="venue-top">
                <span className="venue-name">{v.name}</span>
                <span className="venue-meta">
                  {v.rating !== null && (
                    <span className="star">
                      ★ {v.rating.toFixed(1)} <span className="sub">({v.ratingCount})</span>
                    </span>
                  )}
                  {v.price && <span className="price">{v.price}</span>}
                </span>
              </div>
              <div className="sub">
                {v.kind && `${v.kind} · `}
                {v.address}
              </div>
              <div className="venue-trip">
                About {km(v.average)} from everyone on average · furthest is {v.furthest.name} at {km(v.furthest.km)}
              </div>
            </a>
          ))}

          {missing.length > 0 && venues.length > 0 && (
            <p className="block-note" style={{ marginTop: 12 }}>
              Not included (no home area yet): {missing.join(", ")}.
            </p>
          )}
          {venues.length > 0 && <p className="block-note">Distances are as the crow flies. Tap a place to open it in Google Maps.</p>}
        </div>
      )}
    </div>
  );
}
