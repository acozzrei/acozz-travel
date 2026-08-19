import { prisma } from "@/lib/prisma";
import { resolveLocationPhoto } from "@/lib/photos";

/** Creates an itinerary item, resolving a real location photo (Places →
 * Street View) when one isn't already supplied and a Maps API key is
 * configured. Shared by the manual "add item" flow and the Gmail import
 * flow so both get the same photo-lookup behavior. */
export async function createItineraryItem(tripId, body, settings) {
  let photoUrl = body.photoUrl || null;
  let photoSource = body.photoSource || null;

  if (!photoUrl && (body.venueName || body.address) && settings?.googleMapsApiKey) {
    const resolved = await resolveLocationPhoto(
      { venueName: body.venueName, address: body.address },
      settings.googleMapsApiKey
    );
    if (resolved) {
      photoUrl = resolved.photoUrl;
      photoSource = resolved.photoSource;
    }
  }

  const item = await prisma.itineraryItem.create({
    data: {
      tripId,
      type: body.type || "activity",
      title: (body.title || body.venueName || "Untitled").trim(),
      venueName: body.venueName || null,
      address: body.address || null,
      startTime: body.startTime ? new Date(body.startTime) : null,
      endTime: body.endTime ? new Date(body.endTime) : null,
      partySize: body.partySize ?? null,
      notes: body.notes || null,
      confirmationNo: body.confirmationNo || null,
      photoUrl,
      photoSource,
      sourceEmailId: body.gmailMsgId || body.sourceEmailId || null,
      sourceSender: body.sender || body.sourceSender || null,
      status: body.status || "confirmed",
    },
  });

  if (body.gmailMsgId || body.sourceEmailId) {
    const gmailMsgId = body.gmailMsgId || body.sourceEmailId;
    await prisma.importedEmail.upsert({
      where: { gmailMsgId },
      create: { gmailMsgId, decision: "imported", itineraryId: item.id },
      update: { decision: "imported", itineraryId: item.id },
    });
  }

  return item;
}
