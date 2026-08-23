// Turns a destination + date range + real Google Places candidates into a
// structured day-by-day itinerary via Claude. Claude never invents specific
// venues here — it's given the real candidate list and told to pick from
// it, which is what keeps restaurant/attraction names and addresses real
// instead of hallucinated. The one place Claude does generate content from
// its own knowledge is the optional "local flavor" note per day (e.g.
// typically-seasonal events) — which is exactly why that note is always
// phrased as a general, unverified suggestion, never a confirmed booking.

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

function formatCandidates(list) {
  if (!list.length) return "(none found)";
  return list.map((p) => `- ${p.name}${p.address ? ` — ${p.address}` : ""}${p.rating ? ` (rated ${p.rating})` : ""}`).join("\n");
}

function buildPrompt({ destinationName, dates, restaurants, activities }) {
  return `You are building a real, usable day-by-day travel itinerary for ${destinationName}, covering these dates: ${dates.join(", ")}.

Real restaurants near the destination (use ONLY these for breakfast/lunch/dinner — do not invent restaurant names):
${formatCandidates(restaurants)}

Real attractions/activities near the destination (use ONLY these for activities — do not invent attraction names):
${formatCandidates(activities)}

For each date, plan: one breakfast, one lunch, one dinner, and 1-2 activities, using only the real places listed above. Spread different places across different days rather than repeating the same restaurant. If there aren't enough candidates to fill every slot without repeats, it's fine to leave a slot as a generic activity like "Explore the old town on foot" instead of reusing a place, or repeat a well-reviewed one — never invent a specific business name that wasn't given to you.

You may add ONE optional "localNote" per day mentioning something typically worth checking locally (a market, a seasonal happening, a neighborhood event) — but you must phrase it as a general, unverified suggestion (e.g. "Worth checking: [neighborhood] often has evening markets around this time of year — confirm locally"), never as a confirmed specific event with a made-up name, since you cannot actually know what's scheduled on these exact dates.

Respond with ONLY a JSON array (no prose, no markdown fences), one object per date, in this exact shape:
[
  {
    "date": "YYYY-MM-DD",
    "localNote": "string or null",
    "items": [
      { "type": "breakfast", "time": "08:00", "venueName": "exact name from the list above", "address": "exact address from the list above", "title": "short display title" },
      { "type": "activity", "time": "10:00", "venueName": "...", "address": "...", "title": "..." },
      { "type": "lunch", "time": "12:30", "venueName": "...", "address": "...", "title": "..." },
      { "type": "activity", "time": "15:00", "venueName": "...", "address": "...", "title": "..." },
      { "type": "dinner", "time": "19:00", "venueName": "...", "address": "...", "title": "..." }
    ]
  }
]`;
}

/** @returns {Promise<Array<{date: string, localNote: string|null, items: Array}>>} */
export async function generateItinerary({ destinationName, startDate, endDate, restaurants, activities, anthropicApiKey }) {
  const dates = enumerateDates(startDate, endDate);
  if (dates.length === 0) throw new Error("End date must be on or after the start date.");
  if (dates.length > 21) throw new Error("Trips longer than 21 days aren't supported by the generator yet.");

  const prompt = buildPrompt({ destinationName, dates, restaurants, activities });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": anthropicApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Claude API error (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const raw = data?.content?.[0]?.text?.trim();
  if (!raw) throw new Error("Claude returned an empty response.");
  const jsonStr = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "");
  const days = JSON.parse(jsonStr);
  if (!Array.isArray(days)) throw new Error("Claude's response wasn't a JSON array.");
  return days;
}

export { enumerateDates };
