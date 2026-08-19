// Dates/times throughout this app are stored as the destination's own
// wall-clock value, using UTC only as a storage convention (not a real UTC
// conversion) — see the longer note in lib/demoData.js. Every formatter
// here renders with timeZone: "UTC" so the original wall-clock value comes
// back unchanged, no matter where the viewer's browser is.

export function formatRange(start, end) {
  if (!start) return null;
  const opts = { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" };
  const s = new Date(start).toLocaleDateString("en-US", opts);
  if (!end) return s;
  const e = new Date(end).toLocaleDateString("en-US", opts);
  return `${s} – ${e}`;
}

export function dayKey(dt) {
  return new Date(dt).toISOString().slice(0, 10);
}

export function dayLabel(key) {
  return new Date(key + "T00:00:00Z").toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(dt) {
  if (!dt) return null;
  return new Date(dt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
}
