import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { getRequestAppAccess } from "@/lib/appAuth";

// GET /api/places/photo — proxies Google place photos / Street View so the
// Google Maps API key never leaves the server. Every option in the trip
// planner gets a picture through here: a real venue photo when Google has
// one (?ref=), otherwise Street View at the venue's coordinates (?lat=&lng=
// or ?address=). Any authenticated app role (view or edit) may use it since
// photos also render on shared trip views.
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
  const address = params.get("address");

  const url = new URL("https://maps.googleapis.com/maps/api/place/photo");
  if (ref) {
    url.searchParams.set("maxwidth", "800");
    url.searchParams.set("photo_reference", ref);
  } else {
    url.pathname = "/maps/api/streetview";
    url.searchParams.set("size", "800x600");
    url.searchParams.set("fov", "80");
    if (lat != null && lng != null && lat !== "" && lng !== "") {
      url.searchParams.set("location", `${lat},${lng}`);
    } else if (address) {
      url.searchParams.set("location", address);
    } else {
      return NextResponse.json({ error: "Provide ref, lat+lng, or address." }, { status: 400 });
    }
  }
  url.searchParams.set("key", settings.googleMapsApiKey);

  // Redirect rather than streaming bytes: the browser caches Google's CDN
  // response directly and we avoid proxying image bodies through the server.
  return NextResponse.redirect(url.toString(), 307);
}
