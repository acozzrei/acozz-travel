// Parses free-text regeneration feedback ("cheaper hotels, more sushi, add
// hiking") into structured directives the planner can act on. Rule-based —
// no LLM, so it only ever steers real Google Places candidates.

const TIER_DOWN = [
  "cheaper", "cheap", "budget", "affordable", "save money", "saving money",
  "economical", "inexpensive", "low-key", "low key", "thrifty",
];
const TIER_UP = [
  "luxury", "luxurious", "splurge", "fancy", "upscale", "nicer", "premium",
  "high-end", "high end", "bougie", "5-star", "five star", "posh",
];

const CUISINES = [
  "sushi", "japanese", "italian", "pizza", "mexican", "tacos", "thai",
  "chinese", "indian", "french", "seafood", "steak", "steakhouse", "vegan",
  "vegetarian", "veggie", "bbq", "barbecue", "brunch", "ramen", "tapas",
  "spanish", "greek", "korean", "vietnamese", "mediterranean", "german",
  "irish", "pub", "diner", "cafe", "bakery", "deli", "ethiopian", "lebanese",
  "turkish", "caribbean", "cuban",
];

// Maps feedback words to activity category keys (see lib/activityCategories).
const ACTIVITY_HINTS = [
  { words: ["museum", "museums", "art", "gallery", "galleries", "exhibit"], category: "museums" },
  { words: ["hike", "hiking", "trail", "trails", "nature", "park", "parks", "garden", "gardens", "outdoor", "outdoors", "beach", "beaches", "lake", "mountain", "mountains", "waterfall"], category: "outdoors" },
  { words: ["shop", "shopping", "mall", "malls", "market", "markets", "boutique", "boutiques"], category: "shopping" },
  { words: ["nightlife", "bar", "bars", "club", "clubs", "cocktail", "cocktails", "drinks", "live music", "rooftop"], category: "nightlife" },
  { words: ["spa", "spas", "relax", "relaxing", "relaxation", "massage", "wellness", "pool"], category: "relaxation" },
  { words: ["kid", "kids", "family", "children", "amusement"], category: "family" },
  { words: ["sightseeing", "landmark", "landmarks", "tour", "tours", "historic", "history", "monument"], category: "sightseeing" },
];

function hasWord(haystack, word) {
  // Match whole words/phrases so "bar" doesn't hit "barbecue".
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(haystack);
}

/**
 * @param {string} text free-text feedback from the traveler
 * @returns {{ tierBias: "low"|"high"|null, cuisines: string[], activityKeys: string[], summary: string[] }}
 */
export function parseFeedback(text) {
  const t = (text || "").toLowerCase();
  const out = { tierBias: null, cuisines: [], activityKeys: [], summary: [] };
  if (!t.trim()) return out;

  if (TIER_DOWN.some((w) => hasWord(t, w))) {
    out.tierBias = "low";
    out.summary.push("leaning cheaper");
  } else if (TIER_UP.some((w) => hasWord(t, w))) {
    out.tierBias = "high";
    out.summary.push("leaning nicer");
  }

  for (const c of CUISINES) {
    if (hasWord(t, c) && !out.cuisines.includes(c)) out.cuisines.push(c);
  }
  if (out.cuisines.length > 0) {
    out.summary.push(`more ${out.cuisines.join(" / ")} spots`);
  }

  for (const hint of ACTIVITY_HINTS) {
    if (hint.words.some((w) => hasWord(t, w)) && !out.activityKeys.includes(hint.category)) {
      out.activityKeys.push(hint.category);
    }
  }
  if (out.activityKeys.length > 0) {
    const labels = { sightseeing: "sightseeing", museums: "museums & art", outdoors: "outdoors", shopping: "shopping", nightlife: "nightlife", family: "family fun", relaxation: "relaxation" };
    out.summary.push(`more ${out.activityKeys.map((k) => labels[k] || k).join(" / ")}`);
  }

  return out;
}
