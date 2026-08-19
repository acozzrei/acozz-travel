import { prisma } from "@/lib/prisma";

/** Turns a trip name into a URL-friendly slug: lowercase, alphanumeric words
 * joined by single hyphens. "Grand Cayman!" -> "grand-cayman". */
export function slugify(name) {
  const base = (name || "trip")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents (e.g. "cancun" from "cancún")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "trip";
}

/** Generates a slug from a trip name, appending -2, -3, etc. if it's already
 * taken. Slugs are assigned once at creation and don't change if the trip is
 * later renamed, so links stay stable. */
export async function uniqueTripSlug(name) {
  const base = slugify(name);
  let candidate = base;
  let n = 2;
  // Small dataset (single-user trip list) — a loop of exact-match checks is
  // simpler and plenty fast here, no need for a cleverer collision scheme.
  while (await prisma.trip.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

/** Finds a trip by either its slug (normal case, from a URL) or its raw
 * database id (older links / internal calls that already have the id). */
export function findTripByIdOrSlug(idOrSlug, extra = {}) {
  return prisma.trip.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    ...extra,
  });
}
