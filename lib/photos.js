// Resolves a real photo for an itinerary item's exact location:
// 1. Try Google Places (a photo of the actual venue, if Google has one).
// 2. Fall back to Google Street View Static (a real photo of the exact
//    address/coordinates, even when no venue-specific photo exists).
// 3. If no API key is configured, return null so the caller can show a
//    labeled placeholder instead of pretending to have a real photo.

async function findPlace(query, apiKey) {
  const url = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json");
  url.searchParams.set("input", query);
  url.searchParams.set("inputtype", "textquery");
  url.searchParams.set("fields", "place_id,geometry,photos,formatted_address,name");
  url.searchParams.set("key", apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  return data.candidates?.[0] || null;
}

async function geocode(address, apiKey) {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  const loc = data.results?.[0]?.geometry?.location;
  return loc || null;
}

function placesPhotoUrl(photoReference, apiKey, maxWidth = 1200) {
  const url = new URL("https://maps.googleapis.com/maps/api/place/photo");
  url.searchParams.set("maxwidth", String(maxWidth));
  url.searchParams.set("photo_reference", photoReference);
  url.searchParams.set("key", apiKey);
  return url.toString();
}

function streetViewUrl({ lat, lng, address }, apiKey, size = "1200x800") {
  const url = new URL("https://maps.googleapis.com/maps/api/streetview");
  url.searchParams.set("size", size);
  url.searchParams.set("location", lat != null && lng != null ? `${lat},${lng}` : address);
  url.searchParams.set("fov", "80");
  url.searchParams.set("key", apiKey);
  return url.toString();
}

/**
 * @param {{venueName?: string, address?: string}} item
 * @param {string|null} apiKey
 * @returns {Promise<{photoUrl: string, photoSource: string, lat?: number, lng?: number} | null>}
 */
export async function resolveLocationPhoto(item, apiKey) {
  if (!apiKey) return null;
  const query = [item.venueName, item.address].filter(Boolean).join(", ");
  if (!query) return null;

  try {
    const place = await findPlace(query, apiKey);
    if (place?.photos?.length) {
      return {
        photoUrl: placesPhotoUrl(place.photos[0].photo_reference, apiKey),
        photoSource: "places",
        lat: place.geometry?.location?.lat,
        lng: place.geometry?.location?.lng,
      };
    }

    const loc = place?.geometry?.location || (item.address ? await geocode(item.address, apiKey) : null);
    if (loc) {
      return {
        photoUrl: streetViewUrl({ lat: loc.lat, lng: loc.lng }, apiKey),
        photoSource: "streetview",
        lat: loc.lat,
        lng: loc.lng,
      };
    }

    if (item.address) {
      return { photoUrl: streetViewUrl({ address: item.address }, apiKey), photoSource: "streetview" };
    }
  } catch {
    return null;
  }
  return null;
}
