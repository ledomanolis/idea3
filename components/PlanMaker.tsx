"use client";

import { useState } from "react";
import FindTime from "@/components/FindTime";
import FindPlace, { type PickedVenue } from "@/components/FindPlace";
import { createPlan } from "@/app/plans/actions";

// <input type="datetime-local"> wants "2026-10-31T19:00" in the viewer's own time.
function toLocalInput(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const toIso = (local: string) => (local ? new Date(local).toISOString() : "");

// Find a time + Find a place, with "Pick" buttons that fill in a plan.
export default function PlanMaker({ groupId }: { groupId: string }) {
  const [pickedStart, setPickedStart] = useState<number | null>(null);
  const [venue, setVenue] = useState<PickedVenue | null>(null);

  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [venueName, setVenueName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function pickTime(s: number, e: number) {
    setPickedStart(s);
    setStart(toLocalInput(s));
    setEnd(toLocalInput(e));
  }

  function pickVenue(v: PickedVenue) {
    setVenue(v);
    setVenueName(v.name);
    if (!title) setTitle(v.planLabel);
  }

  // Typing a different place by hand drops the Google Maps link and address.
  const linked = venue && venue.name === venueName ? venue : null;

  return (
    <>
      <section className="block">
        <h3>Find a time</h3>
        <p className="block-note">Checks everyone&apos;s linked calendar over the next two weeks.</p>
        <FindTime groupId={groupId} onPick={pickTime} pickedStart={pickedStart} />
      </section>

      <section className="block">
        <h3>Find a place</h3>
        <p className="block-note">Ideas near the middle of everyone&apos;s home areas, fairest trip first.</p>
        <FindPlace groupId={groupId} onPick={pickVenue} pickedId={venue?.id} />
      </section>

      <section className="block" id="make-plan">
        <h3>Make the plan</h3>
        <p className="block-note">Pick a time and a place above, or fill it in yourself.</p>
        <form action={createPlan} onSubmit={() => setSubmitting(true)} className="panel plan-form">
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="startsAt" value={toIso(start)} />
          <input type="hidden" name="endsAt" value={toIso(end)} />
          <input type="hidden" name="venueName" value={venueName} />
          <input type="hidden" name="venueAddress" value={linked?.address || ""} />
          <input type="hidden" name="venueUrl" value={linked?.mapsUrl || ""} />

          <div className="field">
            <label htmlFor="plan-title">What&apos;s the plan?</label>
            <input
              id="plan-title"
              type="text"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Drinks, Sam's birthday dinner"
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="plan-start">Starts</label>
              <input
                id="plan-start"
                type="datetime-local"
                required
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  setPickedStart(null);
                }}
              />
            </div>
            <div className="field">
              <label htmlFor="plan-end">Ends (optional)</label>
              <input id="plan-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="plan-venue">Where? (optional)</label>
            <input
              id="plan-venue"
              type="text"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="Pick a place above, or type one"
            />
            {linked && <span className="field-hint">📍 {linked.address}</span>}
          </div>
          <div className="field">
            <label htmlFor="plan-notes">Anything else? (optional)</label>
            <textarea
              id="plan-notes"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. I'll book a table for 8"
            />
          </div>
          <button className="btn primary" type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Propose plan!"}
          </button>
        </form>
      </section>
    </>
  );
}
