import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { getRequestAppAccess } from "@/lib/appAuth";
import { resolveDestination, searchNearbyPlaces } from "@/lib/placesSearch";
import { buildPlan, flightSearchUrl } from "@/lib/planBuilder";
import { searchFlightOptions } from "@/lib/flights";
import { enumerateDates } from "@/lib/itineraryGenerator";
import { ACTIVITY_CATEGORIES } from "@/lib/activityCategories";

// POST /api/trips/plan — returns a pick-and-choose proposal (JSON) for a
// destination + date range. Writes nothing; the frontend POSTs the traveler's
// selections to /api/trips/plan/create to actually build the trip.
export async function POST(request) {
  const body = await request.json();
  const {
    placeId,
    destinationName: typedName,
    startDate,
    endDate,
    masterPassword,
    activityTypes,
    homeAirport,
    destAirport,
    partySize,
  } = body;
  if (!placeId || !startDate || !endDate) {
    return NextResponse.json({ error: "Destination and dates are required." }, { status: 400 });
  }

  const settings = await getSettings();
  const role = await getRequestAppAccess(settings);
  if (role !== "edit") {
    return NextResponse.json({ error: "Full access required" }, { status: 401 });
  }
  if (!settings.masterPassword) {
    return NextResponse.json({ error: "Set a master password in Settings before planning trips." }, { status: 400 });
  }
  if (masterPassword !== settings.masterPassword) {
    return NextResponse.json({ error: "Incorrect master password." }, { status: 401 });
  }
  if (!settings.googleMapsApiKey) {
    return NextResponse.json({ error: "Add a Google Maps API key in Settings first." }, { status: 400 });
  }

  let dates;
  try {
    dates = enumerateDates(startDate, endDate);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (dates.length > 21) {
    return NextResponse.json({ error: "Trips longer than 21 days aren't supported by the planner yet." }, { status: 400 });
  }

  const selectedCategories = Array.isArray(activityTypes) && activityTypes.length > 0
    ? ACTIVITY_CATEGORIES.filter((c) => activityTypes.includes(c.key))
    : ACTIVITY_CATEGORIES.filter((c) => c.key === "sightseeing");
  const party = Math.max(1, Math.min(20, Number(partySize) || 2));

  let destination, restaurants, lodging, activities;
  try {
    destination = await resolveDestination(placeId, settings.googleMapsApiKey);
    if (!destination) {
      return NextResponse.json({ error: "Couldn't resolve that destination." }, { status: 400 });
    }
    const [restaurantResults, lodgingResults, ...activityResultSets] = await Promise.all([
      searchNearbyPlaces(
        { lat: destination.lat, lng: destination.lng, type: "restaurant" },
        settings.googleMapsApiKey,
        { limit: 30 }
      ),
      searchNearbyPlaces(
        { lat: destination.lat, lng: destination.lng, type: "lodging" },
        settings.googleMapsApiKey,
        { limit: 20 }
      ),
      ...selectedCategories.map((category) =>
        searchNearbyPlaces(
          { lat: destination.lat, lng: destination.lng, type: category.type },
          settings.googleMapsApiKey,
          { limit: 15 }
        )
      ),
    ]);
    restaurants = restaurantResults;
    lodging = lodgingResults;
    const seen = new Set();
    activities = activityResultSets.flat().filter((place) => {
      if (seen.has(place.placeId)) return false;
      seen.add(place.placeId);
      return true;
    });
  } catch (err) {
    return NextResponse.json({ error: `Google Places error: ${err.message}` }, { status: 502 });
  }
  if (restaurants.length === 0 && activities.length === 0 && lodging.length === 0) {
    return NextResponse.json({ error: "Couldn't find any real restaurants, stays, or attractions near that destination." }, { status: 400 });
  }

  const destinationName = (typedName || destination.name || "").trim() || destination.formattedAddress;

  // Live flight options when a Duffel key + both airport codes are present;
  // otherwise the proposal carries a Google Flights search link instead.
  let flights = null;
  try {
    flights = await searchFlightOptions({
      origin: homeAirport,
      destination: destAirport,
      startDate,
      endDate,
      adults: party,
      apiKey: settings.duffelApiKey,
    });
  } catch {
    flights = null;
  }
  const fallbackFlightsUrl = flightSearchUrl(
    (homeAirport || "").trim().toUpperCase() || "home",
    destinationName,
    startDate,
    endDate
  );
  if (flights && flights.searched) {
    for (const opt of flights.options) {
      opt.bookingUrl = fallbackFlightsUrl;
    }
  } else {
    flights = { searched: false, options: [], error: null };
  }
  flights.searchUrl = fallbackFlightsUrl;

  const proposal = buildPlan({
    destinationName,
    dates,
    restaurants,
    activities,
    lodging,
    partySize: party,
    flights,
  });

  return NextResponse.json(proposal);
}
