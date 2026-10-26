import ICAL from "ical.js";

export type Busy = [number, number]; // start, end in ms since epoch

// Calendar apps hand out webcal:// links; they're plain https underneath.
export function normaliseCalendarUrl(raw: string) {
  const url = raw.trim().replace(/^webcal:\/\//i, "https://");
  if (!/^https:\/\/\S+$/i.test(url)) return null;
  return url;
}

// Fetches a calendar subscription (.ics) and returns when its owner is busy
// between `from` and `to`. Event titles and details are never kept.
// All-day events and events marked "free" don't count as busy.
export async function fetchBusy(url: string, from: Date, to: Date): Promise<Busy[]> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error(`Calendar returned ${res.status}`);
  const text = await res.text();

  const root = new ICAL.Component(ICAL.parse(text));
  root.getAllSubcomponents("vtimezone").forEach((tz: any) => ICAL.TimezoneService.register(tz));

  const events = root.getAllSubcomponents("vevent").map((v: any) => new ICAL.Event(v));
  const exceptions = events.filter((e: any) => e.isRecurrenceException());

  const start = from.getTime();
  const end = to.getTime();
  const busy: Busy[] = [];

  function add(component: any, s: any, e: any) {
    if (s.isDate) return; // all-day
    if (component.getFirstPropertyValue("transp") === "TRANSPARENT") return;
    if (component.getFirstPropertyValue("status") === "CANCELLED") return;
    const sMs = s.toJSDate().getTime();
    const eMs = e ? e.toJSDate().getTime() : sMs + 60 * 60 * 1000;
    if (eMs > start && sMs < end) busy.push([sMs, eMs]);
  }

  for (const event of events) {
    if (event.isRecurrenceException()) continue;

    if (!event.isRecurring()) {
      add(event.component, event.startDate, event.endDate);
      continue;
    }

    // Moved or edited single occurrences of a repeating event.
    exceptions
      .filter((x: any) => x.uid === event.uid)
      .forEach((x: any) => event.relateException(x));

    const it = event.iterator();
    let next;
    // The cap stops a years-old daily event from looping forever.
    for (let i = 0; i < 10000 && (next = it.next()); i++) {
      if (next.toJSDate().getTime() > end) break;
      const occ = event.getOccurrenceDetails(next);
      add(occ.item.component, occ.startDate, occ.endDate);
    }
  }

  return busy;
}
