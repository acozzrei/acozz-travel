// Live flight options via the Duffel API (https://duffel.com).
// Needs a Duffel API key saved in Settings; without one (or without airport
// codes) this returns null and the caller falls back to Google Flights links.
// Never throws — failures degrade to { searched: true, options: [], error }.

const DUFFEL_VERSION = "v2";

function carrierNames(offer) {
  const names = new Set();
  for (const slice of offer.slices || []) {
    for (const seg of slice.segments || []) {
      const name = seg?.operating_carrier?.name || seg?.marketing_carrier?.name;
      if (name) names.add(name);
    }
  }
  return [...names];
}

function formatLeg(slice) {
  const segs = slice?.segments || [];
  if (segs.length === 0) return null;
  const first = segs[0];
  const last = segs[segs.length - 1];
  return {
    from: first?.origin?.iata_code || null,
    to: last?.destination?.iata_code || null,
    depart: first?.departing_at || null,
    arrive: last?.arriving_at || null,
    stops: Math.max(segs.length - 1, 0),
  };
}

function normalizeOffer(offer) {
  const price = Number(offer.total_amount);
  if (!Number.isFinite(price)) return null;
  const legs = (offer.slices || []).map(formatLeg).filter(Boolean);
  if (legs.length === 0) return null;
  const stops = Math.max(...legs.map((l) => l.stops));
  const carriers = carrierNames(offer);
  return {
    id: `duffel-${offer.id}`,
    kind: "flight",
    nonstop: stops === 0,
    stops,
    // Duffel's total_amount already covers every passenger on the itinerary.
    price,
    currency: offer.total_currency || "USD",
    priceNote: `est. total for the trip`,
    carriers,
    carrierLabel: carriers.length > 0 ? carriers.join(", ") : "Multiple airlines",
    legs,
    bookingUrl: null, // filled in by the caller (Google Flights hop)
    bookingLabel: "Check & book",
  };
}

export async function searchFlightOptions({ origin, destination, startDate, endDate, adults = 2, apiKey }) {
  if (!apiKey) return null;
  const o = (origin || "").trim().toUpperCase();
  const d = (destination || "").trim().toUpperCase();
  if (!o || !d) return null;
  if (!/^[A-Z]{3}$/.test(o) || !/^[A-Z]{3}$/.test(d)) {
    return { searched: true, options: [], error: "Airport codes must be 3 letters, e.g. CLT." };
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Duffel-Version": DUFFEL_VERSION,
    "Content-Type": "application/json",
  };

  try {
    const createRes = await fetch("https://api.duffel.com/air/offer_requests", {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: {
          slices: [
            { origin: o, destination: d, departure_date: startDate },
            { origin: d, destination: o, departure_date: endDate },
          ],
          passengers: Array.from(
            { length: Math.max(1, Math.min(9, Number(adults) || 1)) },
            () => ({ type: "adult" })
          ),
          cabin_class: "economy",
          max_connections: 2,
        },
      }),
      cache: "no-store",
    });
    if (!createRes.ok) {
      return { searched: true, options: [], error: `Flight search failed (HTTP ${createRes.status}) — check the Duffel API key in Settings.` };
    }
    const created = await createRes.json();
    const requestId = created?.data?.id;
    if (!requestId) {
      return { searched: true, options: [], error: "Flight search returned an unexpected response." };
    }

    const offersRes = await fetch(
      `https://api.duffel.com/air/offers?offer_request_id=${requestId}&limit=40&sort=total_amount`,
      { headers, cache: "no-store" }
    );
    if (!offersRes.ok) {
      return { searched: true, options: [], error: `Couldn't fetch flight offers (HTTP ${offersRes.status}).` };
    }
    const offersJson = await offersRes.json();
    const normalized = (offersJson?.data || []).map(normalizeOffer).filter(Boolean);
    const nonstop = normalized.filter((x) => x.nonstop).slice(0, 3);
    const layover = normalized.filter((x) => !x.nonstop).slice(0, 3);
    return { searched: true, options: [...nonstop, ...layover], error: null };
  } catch (err) {
    return { searched: true, options: [], error: `Flight search failed: ${err.message}` };
  }
}
