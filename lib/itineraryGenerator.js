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

// Spreads N activities across the day around the fixed meal times (08:00
// breakfast, 12:30 lunch, 19:00 dinner) — roughly half before lunch, half
// between lunch and dinner, evenly spaced within each half.
function activityTimesFor(count) {
  const morningSlots = ["09:00", "09:30", "10:00", "10:30", "11:00"];
  const afternoonSlots = ["14:00", "14:30", "15:00", "16:00", "17:00", "17:30"];
  const morningCount = Math.ceil(count / 2);
  const afternoonCount = count - morningCount;
  return [...morningSlots.slice(0, morningCount), ...afternoonSlots.slice(0, afternoonCount)];
}

/**
 * @param {{startDate: string, endDate: string, restaurants: Array, activities: Array, activitiesPerDay?: number}} args
 * @returns {Array<{date: string, items: Array}>}
 */
export function generateItinerary({ startDate, endDate, restaurants, activities, activitiesPerDay = 2 }) {
  const dates = enumerateDates(startDate, endDate);
  if (dates.length === 0) throw new Error("End date must be on or after the start date.");
  if (dates.length > 21) throw new Error("Trips longer than 21 days aren't supported by the generator yet.");
  if (restaurants.length === 0 && activities.length === 0) {
    throw new Error("Couldn't find any real restaurants or attractions matching those filters near that destination.");
  }
  const perDay = Math.max(0, Math.min(6, Math.round(activitiesPerDay)));

  const rankedRestaurants = byRatingDesc(restaurants);
  const rankedActivities = byRatingDesc(activities);
  const activityTimes = activityTimesFor(perDay);
  let restaurantIndex = 0;
  let activityIndex = 0;

  const days = dates.map((date) => {
    const items = [];

    const breakfast = nextFrom(rankedRestaurants, restaurantIndex++);
    if (breakfast) {
      items.push({ type: "breakfast", time: "08:00", venueName: breakfast.name, address: breakfast.address, title: `Breakfast at ${breakfast.name}` });
    }

    activityTimes.forEach((time) => {
      if (time >= "08:00" && time < "12:30") {
        const activity = nextFrom(rankedActivities, activityIndex++);
        if (activity) items.push({ type: "activity", time, venueName: activity.name, address: activity.address, title: `Visit ${activity.name}` });
      }
    });

    const lunch = nextFrom(rankedRestaurants, restaurantIndex++);
    if (lunch) {
      items.push({ type: "lunch", time: "12:30", venueName: lunch.name, address: lunch.address, title: `Lunch at ${lunch.name}` });
    }

    activityTimes.forEach((time) => {
      if (time >= "12:30" && time < "19:00") {
        const activity = nextFrom(rankedActivities, activityIndex++);
        if (activity) items.push({ type: "activity", time, venueName: activity.name, address: activity.address, title: `Visit ${activity.name}` });
      }
    });

    const dinner = nextFrom(rankedRestaurants, restaurantIndex++);
    if (dinner) {
      items.push({ type: "dinner", time: "19:00", venueName: dinner.name, address: dinner.address, title: `Dinner at ${dinner.name}` });
    }

    return { date, items };
  });

  return days;
}

export { enumerateDates };
