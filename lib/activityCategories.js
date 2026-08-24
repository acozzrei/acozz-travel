// Shared between the "New trip" form (labels/checkboxes) and the generate
// API route (mapping a chosen category to the Google Places `type` it
// searches for) — one source of truth so they can't drift apart.
export const ACTIVITY_CATEGORIES = [
  { key: "sightseeing", label: "Sightseeing", type: "tourist_attraction" },
  { key: "museums", label: "Museums & art", type: "museum" },
  { key: "outdoors", label: "Outdoors & nature", type: "park" },
  { key: "shopping", label: "Shopping", type: "shopping_mall" },
  { key: "nightlife", label: "Nightlife", type: "night_club" },
  { key: "family", label: "Family fun", type: "amusement_park" },
  { key: "relaxation", label: "Relaxation & spa", type: "spa" },
];

export const PRICE_LEVELS = [
  { value: "", label: "Any budget" },
  { value: "1", label: "$ — Inexpensive" },
  { value: "2", label: "$$ — Moderate" },
  { value: "3", label: "$$$ — Expensive" },
  { value: "4", label: "$$$$ — Very expensive" },
];
