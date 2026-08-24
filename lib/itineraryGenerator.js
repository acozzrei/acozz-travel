// Turns a destination + date range + real Google Places candidates into a
// structured day-by-day itinerary — no LLM involved. Restaurants and
// activities are real results from lib/placesSearch.js's Nearby Search,
// rotated across days (best-rated first) so nothing is invented and
// nothing repeats until the candidate list actually runs out.

function enumerateDates(startDate, endDate) {
  const dates = [];
  const cur = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

function byRatingDesc(list) {
  return [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
}

function nextFrom(list, index) {
  if (list.length === 0) return null;
  return list[index % list.length];
}

/** @returns {Array<{date: string, items: Array}>} */
export function generateItinerary({ startDate, endDate, restaurants, activities }) {
  const dates = enumerateDates(startDate, endDate);
  if (dates.length === 0) throw new Error("End date must be on or after the start date.");
  if (dates.length > 21) throw new Error("Trips longer than 21 days aren't supported by the generator yet.");
  if (restaurants.length === 0 && activities.length === 0) {
    throw new Error("Couldn't find any real restaurants or attractions near that destination.");
  }

  const rankedRestaurants = byRatingDesc(restaurants);
  const rankedActivities = byRatingDesc(activities);
  let restaurantIndex = 0;
  let activityIndex = 0;

  const days = dates.map((date) => {
    const items = [];

    const breakfast = nextFrom(rankedRestaurants, restaurantIndex++);
    if (breakfast) {
      items.push({ type: "breakfast", time: "08:00", venueName: breakfast.name, address: breakfast.address, title: `Breakfast at ${breakfast.name}` });
    }
    const morningActivity = nextFrom(rankedActivities, activityIndex++);
    if (morningActivity) {
      items.push({ type: "activity", time: "10:00", venueName: morningActivity.name, address: morningActivity.address, title: `Visit ${morningActivity.name}` });
    }
    const lunch = nextFrom(rankedRestaurants, restaurantIndex++);
    if (lunch) {
      items.push({ type: "lunch", time: "12:30", venueName: lunch.name, address: lunch.address, title: `Lunch at ${lunch.name}` });
    }
    const afternoonActivity = nextFrom(rankedActivities, activityIndex++);
    if (afternoonActivity) {
      items.push({ type: "activity", time: "15:00", venueName: afternoonActivity.name, address: afternoonActivity.address, title: `Visit ${afternoonActivity.name}` });
    }
    const dinner = nextFrom(rankedRestaurants, restaurantIndex++);
    if (dinner) {
      items.push({ type: "dinner", time: "19:00", venueName: dinner.name, address: dinner.address, title: `Dinner at ${dinner.name}` });
    }

    return { date, items };
  });

  return days;
}

export { enumerateDates };
