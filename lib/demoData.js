// Real seed data for demo mode, sourced from acozztravel@gmail.com's actual
// booking confirmation emails for an upcoming Grand Cayman trip (Oct 2026):
// a Sixt car rental and three restaurant reservations (OpenTable x2, plus a
// small-business confirmation direct from The Cracked Conch). Venue photos
// were pulled from each restaurant's own listing on explorecayman.com / the
// Cayman Islands tourism site; the trip cover photo is the official Seven
// Mile Beach photo from visitcaymanislands.com; the rental car photo is a
// real Kia press photo of the K3, the model Sixt actually booked. These
// stand in for the Google Places/Street View pipeline until a Google Maps
// API key is added, so the app has something real to show on day one.
//
// Timestamps use the app-wide storage convention: the destination's own
// wall-clock time, written with a "Z" suffix as a storage placeholder —
// NOT a real UTC conversion. "6:30pm in Grand Cayman" is stored as
// T18:30:00.000Z, not shifted by Cayman's actual UTC-5 offset. Every
// display component formats these back out with timeZone: "UTC" so the
// original wall-clock digits always come back, no matter where the
// viewer's browser is. (There's no per-item real timezone/geo offset in
// this MVP — see the README for how to extend it.)

export const DEMO_TRIP = {
  name: "Grand Cayman",
  destination: "Grand Cayman, Cayman Islands",
  startDate: "2026-10-15T00:00:00.000Z",
  endDate: "2026-10-19T00:00:00.000Z",
  coverPhoto: "/demo/grand-cayman-cover.jpg",
};

export const DEMO_ITEMS = [
  {
    type: "transport",
    title: "Rental car — Kia K3 or similar (Sixt)",
    venueName: "Sixt — Grand Cayman Airport",
    address: "257 Roberts Drive, Unit 7, Owen Roberts International Airport, George Town, Cayman Islands",
    startTime: "2026-10-15T12:00:00.000Z", // 12:00pm at the destination
    endTime: "2026-10-19T10:00:00.000Z", // 10:00am at the destination
    confirmationNo: "9738061511",
    notes:
      "Return Oct 19, 2026 at 10:00 am. Basic Protection, unlimited kilometers.\n\n" +
      "Getting there: Sixt isn't inside the terminal. Exit through the arrivals hall, turn left, and walk " +
      "about 200m to the pedestrian crossing — cross to the airport plaza, where Sixt is in the far left " +
      "corner. No shuttle needed. Rental spaces are directly in front of the Sixt office (don't use the " +
      "airport's own parking). Open daily 8:00am–10:00pm; bring a physical driver's license, ID/passport, " +
      "and a physical credit card in the renter's name.",
    status: "confirmed",
    sourceSender: "booking@sixt.com",
    sourceEmailId: "1a000d7d2ace222a",
    // A real Kia K3 press photo, since a Street View of the airport
    // wouldn't actually show what's being picked up — see lib/photos.js
    // and the "vehicle" photoSource for why rentals skip the usual
    // Places/Street View lookup.
    photoUrl: "/demo/kia-k3.jpg",
    photoSource: "vehicle",
  },
  {
    type: "dinner",
    title: "The Cracked Conch",
    venueName: "The Cracked Conch Restaurant",
    address: "857 Northwest Point Road, P.O. Box 30114, KY1-1201 Grand Cayman, Cayman Islands",
    startTime: "2026-10-15T18:30:00.000Z", // 6:30pm at the destination
    partySize: 2,
    notes: "Confirmed directly by the restaurant's reservations team.",
    status: "confirmed",
    sourceSender: "reservationscrackedconch@gmail.com",
    sourceEmailId: "1a0016b2236ad3f3",
    photoUrl: "/demo/cracked-conch.jpg",
    photoSource: "demo",
  },
  {
    type: "dinner",
    title: "NOVA",
    venueName: "NOVA",
    address: "18-A Sea Fan Drive, West Bay, Grand Cayman KY1-1401, Cayman Islands",
    startTime: "2026-10-16T18:30:00.000Z", // 6:30pm at the destination
    partySize: 2,
    confirmationNo: "16581",
    notes: "Beach dining. Sunset happy hour 5–7pm.",
    status: "confirmed",
    sourceSender: "no-reply@opentable.com",
    sourceEmailId: "1a0014a11e4a3b79",
    photoUrl: "/demo/nova.jpg",
    photoSource: "demo",
  },
  {
    type: "dinner",
    title: "Casanova By The Sea",
    venueName: "Casanova By The Sea",
    address: "65 N Church St, George Town, George Town KY1-1112, Cayman Islands",
    startTime: "2026-10-17T18:30:00.000Z", // 6:30pm at the destination
    partySize: 2,
    confirmationNo: "5646",
    notes: "Outdoor seating.",
    status: "confirmed",
    sourceSender: "no-reply@opentable.com",
    sourceEmailId: "1a001514b45563b1",
    photoUrl: "/demo/casanova.jpg",
    photoSource: "demo",
  },
];

/** Shown in the "Import from Gmail" panel when the app's own Gmail
 * connection isn't set up yet, so the flow can be demoed end to end. */
export const DEMO_GMAIL_CANDIDATES = DEMO_ITEMS.map((item) => ({
  gmailMsgId: item.sourceEmailId,
  sender: item.sourceSender,
  subject: item.title,
  snippet: item.notes,
  ...item,
}));
