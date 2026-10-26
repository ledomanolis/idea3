// Google Maps calls. Server-only: they use GOOGLE_MAPS_API_KEY.

export type LatLng = { lat: number; lng: number };

export const PLAN_TYPES: Record<string, { label: string; query: string; usePrice: boolean }> = {
  bar: { label: "Drinks", query: "bars and pubs", usePrice: true },
  restaurant: { label: "Dinner", query: "restaurants", usePrice: true },
  brunch: { label: "Brunch", query: "brunch cafes", usePrice: true },
  coffee: { label: "Coffee", query: "coffee shops", usePrice: false },
  activity: { label: "Activity", query: "bowling, karaoke, mini golf, escape rooms", usePrice: false },
};

export const BUDGETS: Record<string, { label: string; levels: string[] }> = {
  any: { label: "Any budget", levels: [] },
  low: { label: "£ — cheap and cheerful", levels: ["PRICE_LEVEL_INEXPENSIVE"] },
  mid: { label: "££ — mid-range", levels: ["PRICE_LEVEL_INEXPENSIVE", "PRICE_LEVEL_MODERATE"] },
  high: { label: "£££ — treat yourself", levels: ["PRICE_LEVEL_MODERATE", "PRICE_LEVEL_EXPENSIVE", "PRICE_LEVEL_VERY_EXPENSIVE"] },
};

const PRICE_SYMBOLS: Record<string, string> = {
  PRICE_LEVEL_FREE: "Free",
  PRICE_LEVEL_INEXPENSIVE: "£",
  PRICE_LEVEL_MODERATE: "££",
  PRICE_LEVEL_EXPENSIVE: "£££",
  PRICE_LEVEL_VERY_EXPENSIVE: "££££",
};

function apiKey() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY is not set");
  return key;
}

// Postcode or area name -> rough coordinates (rounded to ~1 km).
export async function geocodeArea(area: string): Promise<LatLng | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?region=uk&address=${encodeURIComponent(area)}&key=${apiKey()}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  // ZERO_RESULTS just means "no such place"; anything else is a key or setup problem.
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Geocoding failed: ${data.status} ${data.error_message || ""}`);
  }
  const loc = data.results?.[0]?.geometry?.location;
  if (!loc) return null;
  return { lat: Math.round(loc.lat * 100) / 100, lng: Math.round(loc.lng * 100) / 100 };
}

export function distanceKm(a: LatLng, b: LatLng) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function midpoint(points: LatLng[]): LatLng {
  return {
    lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
    lng: points.reduce((s, p) => s + p.lng, 0) / points.length,
  };
}

export type Venue = {
  id: string;
  name: string;
  kind: string;
  address: string;
  rating: number | null;
  ratingCount: number;
  price: string | null;
  mapsUrl: string;
  location: LatLng;
};

export async function searchVenues(center: LatLng, type: string, budget: string): Promise<Venue[]> {
  const plan = PLAN_TYPES[type] || PLAN_TYPES.bar;
  const levels = plan.usePrice ? BUDGETS[budget]?.levels || [] : [];

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.googleMapsUri,places.location,places.primaryTypeDisplayName,places.businessStatus",
    },
    body: JSON.stringify({
      textQuery: plan.query,
      locationBias: { circle: { center: { latitude: center.lat, longitude: center.lng }, radius: 1500 } },
      ...(levels.length ? { priceLevels: levels } : {}),
      minRating: 4,
      pageSize: 12,
    }),
  });
  if (!res.ok) throw new Error(`Places search failed: ${res.status} ${await res.text()}`);
  const data = await res.json();

  return (data.places || [])
    .filter((p: any) => !p.businessStatus || p.businessStatus === "OPERATIONAL")
    .map((p: any) => ({
      id: p.id,
      name: p.displayName?.text || "Unnamed",
      kind: p.primaryTypeDisplayName?.text || "",
      address: p.formattedAddress || "",
      rating: p.rating ?? null,
      ratingCount: p.userRatingCount ?? 0,
      price: p.priceLevel ? PRICE_SYMBOLS[p.priceLevel] || null : null,
      mapsUrl: p.googleMapsUri,
      location: { lat: p.location.latitude, lng: p.location.longitude },
    }));
}
