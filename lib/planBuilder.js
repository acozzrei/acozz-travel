// Builds a pick-and-choose trip proposal from real Google Places candidates.
// Every option carries a price tier (low / medium / high, derived from
// Google's price_level), a cost estimate, and a booking link — no LLM, so
// nothing is invented. The frontend lets the traveler pick one option per
// slot and shows a running estimated total before anything is saved.

export const TIERS = ["low", "medium", "high"];
export const TIER_LABELS = { low: "Low", medium: "Medium", high: "High" };
export const TIER_MARKS = { low: "$", medium: "$$", high: "$$$" };

export function tierFor(priceLevel) {
  if (priceLevel === 0 || priceLevel === 1) return "low";
  if (priceLevel === 2) return "medium";
  if (priceLevel === 3 || priceLevel === 4) return "high";
  return "medium"; // unknown price -> middle of the road
}

// Per-person meal estimates by Google price_level.
const MEAL_COST = { 0: 15, 1: 25, 2: 55, 3: 110, 4: 180 };
export function estimateMealCost(priceLevel) {
  return MEAL_COST[priceLevel] ?? 45;
}

// Per-night lodging estimates by Google price_level.
const NIGHTLY_COST = { 0: 110, 1: 130, 2: 240, 3: 420, 4: 700 };
export function estimateNightlyCost(priceLevel) {
  return NIGHTLY_COST[priceLevel] ?? 200;
}

// Per-person activity estimates by Google price_level (many are free).
const ACTIVITY_COST = { 0: 0, 1: 10, 2: 25, 3: 60, 4: 100 };
export function estimateActivityCost(priceLevel) {
  return ACTIVITY_COST[priceLevel] ?? 15;
}

export function mapsUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// "Reserve a table" deep link into OpenTable's venue search, prefilled with
// the party size and the meal's date/time. Where OpenTable has no coverage,
// the venue's Google Maps link (on every option) is the fallback.
export function restaurantBookingUrl(name, date, time, partySize) {
  const url = new URL("https://www.opentable.com/s");
  url.searchParams.set("term", name);
  url.searchParams.set("covers", String(partySize));
  if (date && time) url.searchParams.set("dateTime", `${date}T${time}`);
  return url.toString();
}

export function hotelBookingUrl(name, destinationName) {
  const url = new URL("https://www.booking.com/searchresults.html");
  url.searchParams.set("ss", `${name}, ${destinationName}`);
  return url.toString();
}

// Google Flights search for the whole trip; used as the "check live prices"
// fallback, and as the booking hop for Duffel-priced options (Duffel offers
// aren't directly bookable by URL).
export function flightSearchUrl(originLabel, destinationLabel, startDate, endDate) {
  const q = `Flights to ${destinationLabel} from ${originLabel} on ${startDate} through ${endDate}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`;
}

function byRatingDesc(list) {
  return [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
}

// Restaurants whose name matches a requested cuisine float to the top,
// then rating decides within each group.
function byCuisineBoostDesc(list, cuisines) {
  if (!cuisines || cuisines.length === 0) return byRatingDesc(list);
  const matches = (name) => {
    const n = (name || "").toLowerCase();
    return cuisines.some((c) => n.includes(c.toLowerCase()));
  };
  return [...list].sort((a, b) => {
    const am = matches(a.name) ? 1 : 0;
    const bm = matches(b.name) ? 1 : 0;
    return bm - am || (b.rating ?? 0) - (a.rating ?? 0);
  });
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Picks up to perTier top-rated options per tier, rotating within each tier
// by dayIndex so consecutive days don't all offer the same venues.
function tieredForDay(ranked, dayIndex, perTier, mapFn) {
  const groups = { low: [], medium: [], high: [] };
  for (const p of ranked) groups[tierFor(p.priceLevel)].push(p);
  const out = [];
  for (const tier of TIERS) {
    const g = groups[tier];
    const start = g.length ? (dayIndex * perTier) % g.length : 0;
    const rotated = g.length ? [...g.slice(start), ...g.slice(0, start)] : [];
    for (const p of rotated.slice(0, perTier)) out.push(mapFn(p, tier));
  }
  return out;
}

// Every planner option carries a picture: a real Google Places photo of
// the venue when one exists, otherwise Street View at its coordinates —
// served through /api/places/photo so the API key stays server-side.
function optionPhoto(p) {
  if (p.photoRef) {
    return {
      photoUrl: `/api/places/photo?ref=${encodeURIComponent(p.photoRef)}`,
      photoSource: "places",
    };
  }
  if (p.lat != null && p.lng != null) {
    return {
      photoUrl: `/api/places/photo?lat=${p.lat}&lng=${p.lng}`,
      photoSource: "streetview",
    };
  }
  return { photoUrl: null, photoSource: null };
}

const MEAL_TIMES = { breakfast: "08:00", lunch: "12:30", dinner: "19:00" };

function mealOption(mealType, date, partySize) {
  return (p, tier) => ({
    id: `meal-${mealType}-${date}-${p.placeId}`,
    kind: "meal",
    mealType,
    placeId: p.placeId,
    ...optionPhoto(p),
    name: p.name,
    title: `${cap(mealType)} at ${p.name}`,
    venueName: p.name,
    address: p.address,
    rating: p.rating,
    tier,
    priceLevel: p.priceLevel,
    // per person
    estimatedCost: estimateMealCost(p.priceLevel),
    costNote: `est. $${estimateMealCost(p.priceLevel)}/person`,
    bookingUrl: restaurantBookingUrl(p.name, date, MEAL_TIMES[mealType], partySize),
    bookingLabel: "Reserve a table",
    mapsUrl: p.address ? mapsUrl(p.address) : null,
    time: MEAL_TIMES[mealType],
  });
}

function activityOption(p, tier) {
  return {
    id: `act-${p.placeId}`,
    kind: "activity",
    placeId: p.placeId,
    ...optionPhoto(p),
    name: p.name,
    title: `Visit ${p.name}`,
    venueName: p.name,
    address: p.address,
    rating: p.rating,
    tier,
    priceLevel: p.priceLevel,
    // per person
    estimatedCost: estimateActivityCost(p.priceLevel),
    costNote: p.priceLevel === 0 ? "free entry" : `est. $${estimateActivityCost(p.priceLevel)}/person`,
    bookingUrl: null,
    bookingLabel: null,
    mapsUrl: p.address ? mapsUrl(p.address) : null,
    time: null,
  };
}

function lodgingOption(destinationName) {
  return (p, tier) => ({
    id: `stay-${p.placeId}`,
    kind: "lodging",
    placeId: p.placeId,
    ...optionPhoto(p),
    name: p.name,
    title: `Stay at ${p.name}`,
    venueName: p.name,
    address: p.address,
    rating: p.rating,
    tier,
    priceLevel: p.priceLevel,
    // per night (assumes one room)
    estimatedCost: estimateNightlyCost(p.priceLevel),
    costNote: `est. $${estimateNightlyCost(p.priceLevel)}/night`,
    bookingUrl: hotelBookingUrl(p.name, destinationName),
    bookingLabel: "Check price & book",
    mapsUrl: p.address ? mapsUrl(p.address) : null,
    time: null,
  });
}

/**
 * @param {{destinationName: string, dates: string[], restaurants: Array, activities: Array, lodging: Array, partySize: number, flights: object|null, cuisineBoost?: string[], tierBias?: "low"|"high"|null}} args
 * @returns proposal object (JSON-safe, no DB writes)
 */
export function buildPlan({ destinationName, dates, restaurants, activities, lodging, partySize = 2, flights = null, cuisineBoost = [], tierBias = null }) {
  const rankedRestaurants = byCuisineBoostDesc(restaurants, cuisineBoost);
  const rankedActivities = byRatingDesc(activities);
  const rankedLodging = byRatingDesc(lodging);

  const days = dates.map((date, dayIndex) => ({
    date,
    meals: {
      breakfast: tieredForDay(rankedRestaurants, dayIndex, 1, mealOption("breakfast", date, partySize)),
      lunch: tieredForDay(rankedRestaurants, dayIndex + 9, 2, mealOption("lunch", date, partySize)),
      dinner: tieredForDay(rankedRestaurants, dayIndex + 21, 2, mealOption("dinner", date, partySize)),
    },
    activities: tieredForDay(rankedActivities, dayIndex, 3, activityOption),
  }));

  return {
    destination: destinationName,
    startDate: dates[0],
    endDate: dates[dates.length - 1],
    dates,
    partySize,
    nights: Math.max(dates.length - 1, 1),
    // Tier the client should pre-select after regeneration feedback like
    // "cheaper" / "luxury"; null means "use the traveler's budget vibe".
    suggestedTier: tierBias,
    flights,
    lodging: tieredForDay(rankedLodging, 0, 3, lodgingOption(destinationName)),
    days,
  };
}
