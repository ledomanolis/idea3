import Link from "next/link";
import BookingLinks from "@/components/BookingLinks";
import { respondToPlan, cancelPlan, setBooking } from "@/app/plans/actions";
import { formatPlanTime, type Plan, type PlanResponse } from "@/lib/plans";

const CHOICES: [PlanResponse, string][] = [
  ["in", "I'm in!"],
  ["maybe", "Maybe"],
  ["out", "Can't make it"],
];

export default function PlanCard({
  plan,
  userId,
  canCancel,
  showGroup,
}: {
  plan: Plan;
  userId: string;
  canCancel: boolean;
  showGroup?: boolean;
}) {
  const { day, time } = formatPlanTime(plan.starts_at, plan.ends_at);
  const mine = plan.responses.find((r) => r.user_id === userId)?.response;
  const going = plan.responses.filter((r) => r.response === "in");
  const maybe = plan.responses.filter((r) => r.response === "maybe");
  const out = plan.responses.filter((r) => r.response === "out");

  return (
    <div className="plan">
      <div className="plan-when">
        <span className="plan-day">{day}</span>
        <span className="plan-time">{time}</span>
      </div>
      <div className="plan-body">
        {showGroup && plan.groupName && (
          <Link href={`/groups/${plan.group_id}`} className="plan-group">
            {plan.groupName}
          </Link>
        )}
        <div className="plan-title">{plan.title}</div>
        {plan.venue_name && (
          <div className="plan-venue">
            📍{" "}
            {plan.venue_url ? (
              <a href={plan.venue_url} target="_blank" rel="noreferrer">
                {plan.venue_name}
              </a>
            ) : (
              plan.venue_name
            )}
            {plan.venue_address && <span className="sub"> · {plan.venue_address}</span>}
          </div>
        )}
        {plan.notes && <p className="plan-notes">{plan.notes}</p>}

        {plan.booked_by ? (
          <div className="booked">
            <span>
              <b>Booked ✓</b> by {plan.booked_by === userId ? "you" : plan.bookerName}
              {plan.booking_note && <span className="sub"> · {plan.booking_note}</span>}
            </span>
            {(plan.booked_by === userId || canCancel) && (
              <form action={setBooking}>
                <input type="hidden" name="planId" value={plan.id} />
                <button className="btn danger" type="submit">
                  Undo
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="booking">
            <BookingLinks
              website={plan.venue_website}
              mapsUrl={plan.venue_url}
              phone={plan.venue_phone}
              reservable={plan.venue_reservable}
            />
            <details className="mark-booked">
              <summary>Mark as booked</summary>
              <form action={setBooking}>
                <input type="hidden" name="planId" value={plan.id} />
                <input type="hidden" name="booked" value="yes" />
                <div className="field">
                  <input name="note" type="text" placeholder="Optional: e.g. Table for 6 at 7pm, ref ABC123" />
                </div>
                <button className="btn small primary" type="submit">
                  Booked it!
                </button>
              </form>
            </details>
          </div>
        )}

        <div className="plan-who">
          <b>{going.length} going</b>
          {going.length > 0 && `: ${going.map((r) => r.name).join(", ")}`}
          {maybe.length > 0 && <span className="sub"> · Maybe: {maybe.map((r) => r.name).join(", ")}</span>}
          {out.length > 0 && <span className="sub"> · Can&apos;t: {out.map((r) => r.name).join(", ")}</span>}
        </div>

        <div className="btn-row">
          {CHOICES.map(([value, label]) => (
            <form action={respondToPlan} key={value}>
              <input type="hidden" name="planId" value={plan.id} />
              <input type="hidden" name="response" value={value} />
              <button className={`btn small reply ${mine === value ? `chosen ${value}` : ""}`} type="submit">
                {label}
              </button>
            </form>
          ))}
          {canCancel && (
            <form action={cancelPlan}>
              <input type="hidden" name="planId" value={plan.id} />
              <button className="btn danger" type="submit">
                Cancel plan
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
