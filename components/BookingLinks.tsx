// "Book" and "Call" links for a venue. Google doesn't let other apps take
// bookings, so "Book" opens the venue's own site, or its Google Maps page
// (which has a "Reserve a table" button for many restaurants).
export default function BookingLinks({
  website,
  mapsUrl,
  phone,
  reservable,
}: {
  website: string | null;
  mapsUrl: string | null;
  phone: string | null;
  reservable: boolean | null;
}) {
  const bookUrl = website || mapsUrl;
  if (!bookUrl && !phone) return null;

  return (
    <span className="booking-links">
      {reservable && <span className="chip">Takes bookings</span>}
      {bookUrl && (
        <a className="btn small" href={bookUrl} target="_blank" rel="noreferrer">
          {reservable ? "Book" : "Website"}
        </a>
      )}
      {phone && (
        <a className="btn small" href={`tel:${phone.replace(/\s/g, "")}`}>
          Call
        </a>
      )}
    </span>
  );
}
