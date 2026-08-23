// Destination search and real-place lookups for the itinerary generator,
// built on the same Google Maps Platform key already used by lib/photos.js
// (Settings.googleMapsApiKey) — no separate key needed.

// Autocomplete biased to cities/regions/countries ("(regions)"), so typing
// "Lisbon" or "Tuscany" or "Japan" all resolve sensibly, worldwide — not a
// hardcoded list.
export async function searchDestinations(query, apiKey) {
  if (!query || !query.trim()) return [];
  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", query);
  url.searchParams.set("types", "(regions)");
  url.searchParams.set("key", apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();
  return (data.predictions || []).map((p) => ({ placeId: p.place_id, description: p.description }));
}

// Resolves a chosen autocomplete prediction to coordinates + a clean name,
// so the generator knows where to search for real restaurants/attractions.
export async function resolveDestination(placeId, apiKey) {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "name,formatted_address,geometry");
  url.searchParams.set("key", apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  const result = data.result;
  if (!result?.geometry?.location) return null;
  return {
    name: result.name,
    formattedAddress: result.formatted_address,
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
  };
}

// Real, named candidates near the destination for the LLM to build a day
// plan from — it's told to only use these, not invent its own.
export async function searchNearbyPlaces({ lat, lng, type, keyword }, apiKey, { radius = 15000, limit = 20 } = {}) {
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", String(radius));
  url.searchParams.set("type", type);
  if (keyword) url.searchParams.set("keyword", keyword);
  url.searchParams.set("key", apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || [])
    .filter((r) => r.business_status !== "CLOSED_PERMANENTLY")
    .slice(0, limit)
    .map((r) => ({
      name: r.name,
      address: r.vicinity || r.formatted_address || null,
      rating: r.rating ?? null,
      lat: r.geometry?.location?.lat ?? null,
      lng: r.geometry?.location?.lng ?? null,
      placeId: r.place_id,
    }));
}
