import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { getRequestAppAccess } from "@/lib/appAuth";

// GET /api/places/photo — serves Google place photos / Street View for the
// trip planner. Every option gets a picture: a real venue photo when Google
// has one (?ref=), otherwise Street View at the venue's coordinates
// (?lat=&lng=). The image bytes are fetched server-side and streamed back so
// the Google Maps API key never leaves the server and browser-side key
// restrictions can't break loading. If Google has no image, we 404 and the
// UI falls back to its emoji tile — something always renders.
export async function GET(request) {
  const settings = await getSettings();
  const role = await getRequestAppAccess(settings);
  if (!role) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  if (!settings.googleMapsApiKey) {
    return NextResponse.json({ error: "Add a Google Maps API key in Settings first." }, { status: 400 });
  }

  const params = new URL(request.url).searchParams;
  const ref = params.get("ref");
  const lat = params.get("lat");
  const lng = params.get("lng");

  const googleUrl = (kind) => {
    const url = new URL(`https://maps.googleapis.com/maps/api/${kind === "photo" ? "place/photo" : "streetview"}`);
    if (kind === "photo") {
      url.searchParams.set("maxwidth", "800");
      url.searchParams.set("photo_reference", ref);
    } else {
      url.searchParams.set("size", "800x600");
      url.searchParams.set("fov", "80");
      url.searchParams.set("location", `${lat},${lng}`);
    }
    url.searchParams.set("key", settings.googleMapsApiKey);
    return url.toString();
  };

  const attempts = [];
  if (ref) attempts.push("photo");
  if (lat != null && lng != null && lat !== "" && lng !== "") attempts.push("streetview");
  if (attempts.length === 0) {
    return NextResponse.json({ error: "Provide ref or lat+lng." }, { status: 400 });
  }

  for (const kind of attempts) {
    try {
      const googleRes = await fetch(googleUrl(kind), { cache: "no-store" });
      const contentType = googleRes.headers.get("content-type") || "";
      if (googleRes.ok && contentType.startsWith("image/")) {
        const buf = await googleRes.arrayBuffer();
        return new Response(buf, {
          headers: {
            "content-type": contentType,
            "cache-control": "public, max-age=86400, immutable",
          },
        });
      }
    } catch {
      // Try the next fallback.
    }
  }
  return NextResponse.json({ error: "No photo available." }, { status: 404 });
}
