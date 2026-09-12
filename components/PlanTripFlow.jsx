"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ACTIVITY_CATEGORIES } from "@/lib/activityCategories";
import { TIERS, TIER_LABELS, TIER_MARKS } from "@/lib/planBuilder";

// Two-step trip planner: search any destination + dates, then pick & choose
// from real low/medium/high options (flights, stays, meals, activities) with
// a running estimated total, then create the trip from the picks.
export default function PlanTripFlow() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("search");

  // --- search step state ---
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [homeAirport, setHomeAirport] = useState("");
  const [destAirport, setDestAirport] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [budgetVibe, setBudgetVibe] = useState("mixed");
  const [activitiesPerDay, setActivitiesPerDay] = useState(2);
  const [activityTypes, setActivityTypes] = useState(["sightseeing"]);
  const [masterPassword, setMasterPassword] = useState("");

  // --- review step state ---
  const [proposal, setProposal] = useState(null);
  const [flightPick, setFlightPick] = useState(null);
  const [lodgingPick, setLodgingPick] = useState(null);
  const [mealPicks, setMealPicks] = useState({});
  const [activityPicks, setActivityPicks] = useState([]);

  const [planning, setPlanning] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  // --- regenerate state ---
  const [feedback, setFeedback] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState(null);
  const planParamsRef = useRef(null);
  const reviewScrollRef = useRef(null);

  useEffect(() => {
    if (!query.trim() || selected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clears stale suggestions when the query is emptied or a destination is chosen
      setSuggestions([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places/search?q=${encodeURIComponent(query)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Couldn't search destinations.");
          return;
        }
        setError(null);
        setSuggestions(data.results || []);
      } catch {
        setError("Couldn't reach the destination search — check your connection.");
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, selected]);

  function reset() {
    setStep("search");
    setQuery("");
    setSelected(null);
    setStartDate("");
    setEndDate("");
    setHomeAirport("");
    setDestAirport("");
    setPartySize(2);
    setBudgetVibe("mixed");
    setActivitiesPerDay(2);
    setActivityTypes(["sightseeing"]);
    setMasterPassword("");
    setProposal(null);
    setFlightPick(null);
    setLodgingPick(null);
    setMealPicks({});
    setActivityPicks([]);
    setError(null);
    setFeedback("");
    setFeedbackNote(null);
  }

  function toggleActivityType(key) {
    setActivityTypes((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  }

  function preferredTier() {
    return budgetVibe === "mixed" ? "medium" : budgetVibe;
  }

  function firstOfTier(options, tier) {
    return options.find((o) => o.tier === tier) || options[0] || null;
  }

  async function requestProposal(extra = {}) {
    const res = await fetch("/api/trips/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...planParamsRef.current, ...extra }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Couldn't build the plan.");
    return data;
  }

  async function plan(e) {
    e.preventDefault();
    if (!selected) {
      setError("Pick a destination from the suggestions list.");
      return;
    }
    planParamsRef.current = {
      placeId: selected.placeId,
      destinationName: selected.description,
      startDate,
      endDate,
      masterPassword,
      activityTypes,
      homeAirport,
      destAirport,
      partySize,
    };
    setPlanning(true);
    setError(null);
    try {
      const data = await requestProposal();
      setProposal(data);
      applyDefaultPicks(data);
      setFeedbackNote(null);
      setStep("review");
    } catch (err) {
      setError(err.message);
    } finally {
      setPlanning(false);
    }
  }

  function collectPlaceIds() {
    if (!proposal) return [];
    const ids = new Set();
    (proposal.lodging || []).forEach((o) => o.placeId && ids.add(o.placeId));
    (proposal.days || []).forEach((day) => {
      for (const mealType of ["breakfast", "lunch", "dinner"]) {
        (day.meals?.[mealType] || []).forEach((o) => o.placeId && ids.add(o.placeId));
      }
      (day.activities || []).forEach((o) => o.placeId && ids.add(o.placeId));
    });
    return [...ids];
  }

  async function regenerate() {
    if (!proposal || regenerating) return;
    setRegenerating(true);
    setError(null);
    try {
      const data = await requestProposal({
        feedback,
        excludePlaceIds: collectPlaceIds(),
      });
      setProposal(data);
      applyDefaultPicks(data);
      const applied = data.appliedFeedback || [];
      setFeedbackNote(
        applied.length > 0
          ? `Regenerated — ${applied.join(" · ")}. Picks were reset; choose again from the new options.`
          : "Regenerated with fresh options. Picks were reset; choose again."
      );
      setFeedback("");
      reviewScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message);
    } finally {
      setRegenerating(false);
    }
  }

  function applyDefaultPicks(data) {
    const tier = data.suggestedTier || preferredTier();
    // Flights: cheapest nonstop first.
    const flightOpts = data.flights?.options || [];
    const nonstop = flightOpts.filter((f) => f.nonstop);
    setFlightPick((nonstop[0] || flightOpts[0] || null)?.id ?? null);
    // Lodging: preferred tier.
    setLodgingPick(firstOfTier(data.lodging || [], tier)?.id ?? null);
    // Meals: one pick per slot per day, preferred tier.
    const mp = {};
    data.days.forEach((day, di) => {
      for (const mealType of ["breakfast", "lunch", "dinner"]) {
        const pick = firstOfTier(day.meals[mealType] || [], tier);
        if (pick) mp[`${di}-${mealType}`] = pick.id;
      }
    });
    setMealPicks(mp);
    // Activities: up to activitiesPerDay per day, preferred tier first.
    const ap = [];
    data.days.forEach((day, di) => {
      const pool = day.activities || [];
      const ranked = [...pool].sort((a, b) => {
        const at = a.tier === tier ? 0 : 1;
        const bt = b.tier === tier ? 0 : 1;
        return at - bt || (b.rating ?? 0) - (a.rating ?? 0);
      });
      ranked.slice(0, Math.max(0, Math.min(6, Number(activitiesPerDay) || 0))).forEach((o) => {
        ap.push(`${di}:${o.id}`);
      });
    });
    setActivityPicks(ap);
  }

  function toggleActivity(di, id) {
    const key = `${di}:${id}`;
    setActivityPicks((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  }

  function findOption(id) {
    if (!proposal) return null;
    if (proposal.flights?.options) {
      const f = proposal.flights.options.find((o) => o.id === id);
      if (f) return f;
    }
    const l = proposal.lodging.find((o) => o.id === id);
    if (l) return l;
    for (const day of proposal.days) {
      for (const mealType of ["breakfast", "lunch", "dinner"]) {
        const m = (day.meals[mealType] || []).find((o) => o.id === id);
        if (m) return m;
      }
      const a = (day.activities || []).find((o) => o.id === id);
      if (a) return a;
    }
    return null;
  }

  function estimateTotal() {
    if (!proposal) return 0;
    let total = 0;
    const flight = proposal.flights?.options?.find((o) => o.id === flightPick);
    if (flight) total += flight.price;
    const lodging = proposal.lodging.find((o) => o.id === lodgingPick);
    if (lodging) total += lodging.estimatedCost * proposal.nights;
    for (const id of Object.values(mealPicks)) {
      const o = findOption(id);
      if (o) total += o.estimatedCost * proposal.partySize;
    }
    for (const key of activityPicks) {
      const o = findOption(key.split(":").slice(1).join(":"));
      if (o) total += o.estimatedCost * proposal.partySize;
    }
    return total;
  }

  function itemCount() {
    let n = 0;
    if (flightPick) n += 2; // outbound + return
    if (lodgingPick) n += 1;
    n += Object.keys(mealPicks).length;
    n += activityPicks.length;
    return n;
  }

  async function createTrip() {
    if (!proposal) return;
    setCreating(true);
    setError(null);
    try {
      const selections = [];
      const flight = proposal.flights?.options?.find((o) => o.id === flightPick);
      if (flight) {
        const [outbound, inbound] = flight.legs;
        const hhmm = (iso) => (iso ? iso.slice(11, 16) : null);
        if (outbound) {
          selections.push({
            kind: "flight",
            title: `Fly ${outbound.from} → ${outbound.to} (${flight.carrierLabel})`,
            venueName: flight.carrierLabel,
            date: proposal.startDate,
            time: hhmm(outbound.depart),
            estimatedCost: flight.price,
            costNote: `est. $${Math.round(flight.price)} total (${flight.currency})`,
            bookingUrl: flight.bookingUrl,
          });
        }
        if (inbound) {
          selections.push({
            kind: "flight",
            title: `Fly ${inbound.from} → ${inbound.to} (${flight.carrierLabel})`,
            venueName: flight.carrierLabel,
            date: proposal.endDate,
            time: hhmm(inbound.depart),
            estimatedCost: 0,
            costNote: "return leg — price included above",
            bookingUrl: flight.bookingUrl,
          });
        }
      }
      const lodging = proposal.lodging.find((o) => o.id === lodgingPick);
      if (lodging) {
        selections.push({
          kind: "lodging",
          title: lodging.title,
          venueName: lodging.venueName,
          address: lodging.address,
          date: proposal.startDate,
          endDate: proposal.endDate,
          time: null,
          estimatedCost: lodging.estimatedCost,
          costNote: `${lodging.costNote} × ${proposal.nights} night${proposal.nights === 1 ? "" : "s"}`,
          bookingUrl: lodging.bookingUrl,
          photoUrl: lodging.photoUrl,
          photoSource: lodging.photoSource,
        });
      }
      proposal.days.forEach((day, di) => {
        for (const mealType of ["breakfast", "lunch", "dinner"]) {
          const opt = (day.meals[mealType] || []).find((o) => o.id === mealPicks[`${di}-${mealType}`]);
          if (opt) {
            selections.push({
              kind: "meal",
              mealType,
              title: opt.title,
              venueName: opt.venueName,
              address: opt.address,
              date: day.date,
              time: opt.time,
              estimatedCost: opt.estimatedCost,
              costNote: opt.costNote,
              bookingUrl: opt.bookingUrl,
              photoUrl: opt.photoUrl,
              photoSource: opt.photoSource,
            });
          }
        }
        const ACTIVITY_TIMES = ["09:30", "11:00", "14:30", "16:00", "17:30", "18:00"];
        let ti = 0;
        for (const key of activityPicks.filter((k) => k.startsWith(`${di}:`))) {
          const opt = (day.activities || []).find((o) => o.id === key.split(":").slice(1).join(":"));
          if (opt) {
            selections.push({
              kind: "activity",
              title: opt.title,
              venueName: opt.venueName,
              address: opt.address,
              date: day.date,
              time: ACTIVITY_TIMES[ti++ % ACTIVITY_TIMES.length],
              estimatedCost: opt.estimatedCost,
              costNote: opt.costNote,
              bookingUrl: opt.bookingUrl,
              photoUrl: opt.photoUrl,
              photoSource: opt.photoSource,
            });
          }
        }
      });

      const res = await fetch("/api/trips/plan/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          destinationName: proposal.destination,
          startDate: proposal.startDate,
          endDate: proposal.endDate,
          masterPassword,
          partySize: proposal.partySize,
          selections,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't create the trip.");
      setOpen(false);
      reset();
      router.push(`/trips/${data.slug}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition"
      >
        + New trip
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={() => !planning && !creating && (setOpen(false), reset())}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-3xl flex flex-col max-h-[92vh] overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-stone-100">
          <h3 className="font-semibold text-lg">
            {step === "search" ? "Plan a new trip" : `Your ${proposal?.destination} plan`}
          </h3>
          {!planning && !creating && (
            <button
              type="button"
              onClick={() => (setOpen(false), reset())}
              className="text-stone-400 hover:text-stone-700"
            >
              ✕
            </button>
          )}
        </div>

        <div ref={reviewScrollRef} className="overflow-y-auto px-5 py-4 grow">
          {step === "search" ? (
            <form onSubmit={plan} className="flex flex-col gap-3">
              <p className="text-sm text-stone-500">
                Search any destination, pick your dates, and choose from real low / medium / high options
                for flights, stays, meals, and activities — with an estimated total before you commit.
              </p>

              <label className="text-sm font-medium text-stone-600 relative">
                Destination
                <input
                  required
                  disabled={planning}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelected(null);
                  }}
                  placeholder="e.g. Lisbon, Tuscany, Japan…"
                  autoComplete="off"
                  className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm disabled:bg-stone-50"
                />
                {suggestions.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 bg-white border border-stone-200 rounded-lg shadow-md mt-1 max-h-48 overflow-y-auto">
                    {suggestions.map((s) => (
                      <button
                        type="button"
                        key={s.placeId}
                        onClick={() => {
                          setSelected(s);
                          setQuery(s.description);
                          setSuggestions([]);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50"
                      >
                        {s.description}
                      </button>
                    ))}
                  </div>
                )}
              </label>

              <div className="flex gap-2">
                <label className="text-sm font-medium text-stone-600 flex-1">
                  Start date
                  <input
                    required
                    disabled={planning}
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm disabled:bg-stone-50"
                  />
                </label>
                <label className="text-sm font-medium text-stone-600 flex-1">
                  End date
                  <input
                    required
                    disabled={planning}
                    type="date"
                    min={startDate || undefined}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm disabled:bg-stone-50"
                  />
                </label>
                <label className="text-sm font-medium text-stone-600 w-24">
                  Travelers
                  <input
                    disabled={planning}
                    type="number"
                    min={1}
                    max={20}
                    value={partySize}
                    onChange={(e) => setPartySize(e.target.value)}
                    className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm disabled:bg-stone-50"
                  />
                </label>
              </div>

              <div className="flex gap-2">
                <label className="text-sm font-medium text-stone-600 flex-1">
                  Home airport <span className="font-normal text-stone-400">(for flights)</span>
                  <input
                    disabled={planning}
                    value={homeAirport}
                    onChange={(e) => setHomeAirport(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3))}
                    placeholder="CLT"
                    className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm disabled:bg-stone-50 uppercase"
                  />
                </label>
                <label className="text-sm font-medium text-stone-600 flex-1">
                  Destination airport
                  <input
                    disabled={planning}
                    value={destAirport}
                    onChange={(e) => setDestAirport(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3))}
                    placeholder="LIS"
                    className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm disabled:bg-stone-50 uppercase"
                  />
                </label>
                <label className="text-sm font-medium text-stone-600 flex-1">
                  Budget vibe
                  <select
                    disabled={planning}
                    value={budgetVibe}
                    onChange={(e) => setBudgetVibe(e.target.value)}
                    className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm disabled:bg-stone-50"
                  >
                    <option value="mixed">Mixed — I&apos;ll pick</option>
                    <option value="low">Low — keep it cheap</option>
                    <option value="medium">Medium — comfortable</option>
                    <option value="high">High — spare no expense</option>
                  </select>
                </label>
              </div>

              <div className="flex gap-2 items-end">
                <label className="text-sm font-medium text-stone-600 w-36">
                  Activities per day
                  <input
                    disabled={planning}
                    type="number"
                    min={0}
                    max={6}
                    value={activitiesPerDay}
                    onChange={(e) => setActivitiesPerDay(e.target.value)}
                    className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm disabled:bg-stone-50"
                  />
                </label>
                <div className="flex-1">
                  <span className="text-sm font-medium text-stone-600">Kinds of activities</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {ACTIVITY_CATEGORIES.map((c) => (
                      <button
                        type="button"
                        key={c.key}
                        disabled={planning}
                        onClick={() => toggleActivityType(c.key)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium border transition disabled:opacity-50 ${
                          activityTypes.includes(c.key)
                            ? "bg-teal-600 text-white border-teal-600"
                            : "bg-white text-stone-600 border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <label className="text-sm font-medium text-stone-600">
                Master password
                <input
                  required
                  disabled={planning}
                  type="password"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm disabled:bg-stone-50"
                />
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={planning}
                className="rounded-full bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50 mt-1 flex items-center justify-center gap-2"
              >
                {planning && (
                  <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                )}
                {planning ? "Finding real options…" : "Find options"}
              </button>
            </form>
          ) : (
            <ReviewStep
              proposal={proposal}
              flightPick={flightPick}
              setFlightPick={setFlightPick}
              lodgingPick={lodgingPick}
              setLodgingPick={setLodgingPick}
              mealPicks={mealPicks}
              setMealPicks={setMealPicks}
              activityPicks={activityPicks}
              toggleActivity={toggleActivity}
              onBack={() => setStep("search")}
              feedback={feedback}
              setFeedback={setFeedback}
              regenerating={regenerating}
              onRegenerate={regenerate}
              feedbackNote={feedbackNote}
            />
          )}
        </div>

        {step === "review" && proposal && (
          <div className="border-t border-stone-100 px-5 py-3 flex items-center justify-between gap-3 bg-stone-50">
            <div className="text-sm">
              <span className="text-stone-500">Estimated total</span>{" "}
              <span className="font-semibold text-lg">
                ${Math.round(estimateTotal()).toLocaleString()}
              </span>{" "}
              <span className="text-stone-400 text-xs">for {proposal.partySize} travelers</span>
            </div>
            <div className="flex items-center gap-2">
              {error && <p className="text-sm text-red-600 mr-2">{error}</p>}
              <button
                type="button"
                disabled={creating}
                onClick={createTrip}
                className="rounded-full bg-teal-600 text-white px-5 py-2 text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {creating && (
                  <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                )}
                {creating ? "Creating…" : `Create trip (${itemCount()} items)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(11, 16);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function Stars({ rating }) {
  if (rating == null) return null;
  return <span className="text-amber-500 text-xs">★ {rating.toFixed(1)}</span>;
}

function BookLink({ url, label }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="text-xs text-teal-700 underline hover:text-teal-800 whitespace-nowrap"
    >
      {label || "Book"} ↗
    </a>
  );
}

const KIND_EMOJI = { meal: "🍽️", activity: "🎡", lodging: "🏨" };

function OptionThumb({ option, size = "h-14 w-14", textSize = "text-xl" }) {
  if (option.photoUrl) {
    return (
      <img
        src={option.photoUrl}
        alt=""
        loading="lazy"
        className={`${size} rounded-lg object-cover shrink-0 bg-stone-100`}
      />
    );
  }
  return (
    <span className={`${size} rounded-lg shrink-0 bg-stone-100 flex items-center justify-center ${textSize}`}>
      {KIND_EMOJI[option.kind] || "📍"}
    </span>
  );
}

function OptionCard({ option, selected: isSelected, onSelect, costSuffix }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left rounded-xl border p-3 transition w-full ${
        isSelected ? "border-teal-600 bg-teal-50 ring-1 ring-teal-600" : "border-stone-200 hover:border-stone-300 bg-white"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <OptionThumb option={option} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{option.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-semibold text-stone-500">{TIER_MARKS[option.tier]}</span>
            <Stars rating={option.rating} />
          </div>
        </div>
        <span
          className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
            isSelected ? "border-teal-600 bg-teal-600" : "border-stone-300"
          }`}
        >
          {isSelected && <span className="text-white text-[10px]">✓</span>}
        </span>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-stone-500">
          {option.costNote}
          {costSuffix || ""}
        </span>
        <BookLink url={option.bookingUrl} label={option.bookingLabel} />
      </div>
    </button>
  );
}

function ReviewStep({
  proposal,
  flightPick,
  setFlightPick,
  lodgingPick,
  setLodgingPick,
  mealPicks,
  setMealPicks,
  activityPicks,
  toggleActivity,
  onBack,
  feedback,
  setFeedback,
  regenerating,
  onRegenerate,
  feedbackNote,
}) {
  const flights = proposal.flights;
  const nonstop = (flights?.options || []).filter((f) => f.nonstop);
  const layover = (flights?.options || []).filter((f) => !f.nonstop);

  return (
    <div className="flex flex-col gap-6">
      <button type="button" onClick={onBack} className="text-sm text-teal-700 hover:underline self-start">
        ← Back to search
      </button>

      {/* Feedback + regenerate */}
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
        <p className="text-sm font-medium">Not quite right?</p>
        <p className="text-xs text-stone-500 mt-0.5">
          Say what you&apos;d like different — e.g. &ldquo;cheaper hotels, more sushi, add hiking&rdquo; — then regenerate for fresh options.
        </p>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          disabled={regenerating}
          rows={2}
          placeholder="cheaper hotels, more sushi, add hiking…"
          className="mt-2 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-stone-100"
        />
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenerating}
            className="rounded-full bg-teal-600 text-white px-4 py-1.5 text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {regenerating && (
              <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {regenerating ? "Regenerating…" : "↻ Regenerate options"}
          </button>
          {feedbackNote && <p className="text-xs text-teal-700">{feedbackNote}</p>}
        </div>
      </div>

      {/* Flights */}
      <section>
        <h4 className="font-semibold mb-1">✈️ Flights</h4>
        {flights?.searched && flights.options.length > 0 ? (
          <div className="flex flex-col gap-3">
            {nonstop.length > 0 && (
              <div>
                <p className="text-xs font-medium text-stone-500 mb-1.5">Nonstop</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {nonstop.map((f) => (
                    <FlightCard key={f.id} flight={f} selected={flightPick === f.id} onSelect={() => setFlightPick(f.id)} />
                  ))}
                </div>
              </div>
            )}
            {layover.length > 0 && (
              <div>
                <p className="text-xs font-medium text-stone-500 mb-1.5">With layovers</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {layover.map((f) => (
                    <FlightCard key={f.id} flight={f} selected={flightPick === f.id} onSelect={() => setFlightPick(f.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 p-3 text-sm text-stone-600 flex items-center justify-between gap-2">
            <span>
              {flights?.searched && flights.error
                ? flights.error
                : "Add airport codes (and a Duffel API key in Settings) for live flight prices."}
            </span>
            <a
              href={flights?.searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-teal-700 underline hover:text-teal-800 whitespace-nowrap"
            >
              Check Google Flights ↗
            </a>
          </div>
        )}
      </section>

      {/* Lodging */}
      {proposal.lodging.length > 0 && (
        <section>
          <h4 className="font-semibold mb-1">🏨 Where to stay <span className="font-normal text-stone-400 text-sm">— pick one</span></h4>
          {TIERS.map((tier) => {
            const opts = proposal.lodging.filter((o) => o.tier === tier);
            if (opts.length === 0) return null;
            return (
              <div key={tier} className="mb-2">
                <p className="text-xs font-medium text-stone-500 mb-1.5">
                  {TIER_LABELS[tier]} {TIER_MARKS[tier]}
                </p>
                <div className="grid sm:grid-cols-3 gap-2">
                  {opts.map((o) => (
                    <OptionCard
                      key={o.id}
                      option={o}
                      selected={lodgingPick === o.id}
                      onSelect={() => setLodgingPick(o.id)}
                      costSuffix={` × ${proposal.nights}n`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Days */}
      {proposal.days.map((day, di) => (
        <section key={day.date}>
          <h4 className="font-semibold mb-2">
            {new Date(`${day.date}T00:00:00Z`).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })}
          </h4>

          {["breakfast", "lunch", "dinner"].map((mealType) => {
            const opts = day.meals[mealType] || [];
            if (opts.length === 0) return null;
            const label = mealType === "breakfast" ? "🍳 Breakfast" : mealType === "lunch" ? "🥗 Lunch" : "🍽️ Dinner";
            return (
              <div key={mealType} className="mb-2">
                <p className="text-xs font-medium text-stone-500 mb-1.5">{label}</p>
                {TIERS.map((tier) => {
                  const tierOpts = opts.filter((x) => x.tier === tier);
                  if (tierOpts.length === 0) return null;
                  return (
                    <div key={tier} className="mb-1.5">
                      <p className="text-[11px] text-stone-400 mb-1">
                        {TIER_LABELS[tier]} {TIER_MARKS[tier]}
                      </p>
                      <div className="grid sm:grid-cols-3 gap-2">
                        {tierOpts.map((o) => (
                          <OptionCard
                            key={o.id}
                            option={o}
                            selected={mealPicks[`${di}-${mealType}`] === o.id}
                            onSelect={() => setMealPicks((cur) => ({ ...cur, [`${di}-${mealType}`]: o.id }))}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {(day.activities || []).length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-medium text-stone-500 mb-1.5">
                🎡 Things to do{" "}
                <span className="font-normal">
                  — {activityPicks.filter((k) => k.startsWith(`${di}:`)).length} picked
                </span>
              </p>
              {TIERS.map((tier) => {
                const opts = (day.activities || []).filter((o) => o.tier === tier);
                if (opts.length === 0) return null;
                return (
                  <div key={tier} className="mb-2">
                    <p className="text-[11px] text-stone-400 mb-1">
                      {TIER_LABELS[tier]} {TIER_MARKS[tier]}
                    </p>
                    <div className="grid sm:grid-cols-3 gap-2">
                      {opts.map((o) => {
                        const key = `${di}:${o.id}`;
                        const isSelected = activityPicks.includes(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleActivity(di, o.id)}
                            className={`text-left rounded-xl border p-3 transition ${
                              isSelected ? "border-teal-600 bg-teal-50 ring-1 ring-teal-600" : "border-stone-200 hover:border-stone-300 bg-white"
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <OptionThumb option={o} size="h-12 w-12" textSize="text-lg" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{o.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Stars rating={o.rating} />
                                </div>
                                <p className="text-xs text-stone-500 mt-1">{o.costNote}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function FlightCard({ flight, selected: isSelected, onSelect }) {
  const [outbound, inbound] = flight.legs;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left rounded-xl border p-3 transition w-full ${
        isSelected ? "border-teal-600 bg-teal-50 ring-1 ring-teal-600" : "border-stone-200 hover:border-stone-300 bg-white"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span className="h-14 w-14 rounded-lg shrink-0 bg-stone-100 flex items-center justify-center text-xl">
          ✈️
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{flight.nonstop ? "Nonstop" : `${flight.stops} stop${flight.stops === 1 ? "" : "s"}`}</p>
          <p className="text-xs text-stone-500 mt-0.5">{flight.carrierLabel}</p>
        </div>
        <span className="text-sm font-semibold whitespace-nowrap">
          ${Math.round(flight.price).toLocaleString()}
        </span>
      </div>
      <div className="text-xs text-stone-500 mt-1.5 space-y-0.5">
        {outbound && (
          <p>→ {outbound.from} → {outbound.to} · {fmtTime(outbound.depart)} – {fmtTime(outbound.arrive)}</p>
        )}
        {inbound && (
          <p>← {inbound.from} → {inbound.to} · {fmtTime(inbound.depart)} – {fmtTime(inbound.arrive)}</p>
        )}
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[11px] text-stone-400">{flight.priceNote}</span>
        <BookLink url={flight.bookingUrl} label={flight.bookingLabel} />
      </div>
    </button>
  );
}
