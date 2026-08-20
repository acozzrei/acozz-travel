# A.Cozz Travel

A trip itinerary app: build day-by-day itineraries, pull in real bookings
(dinners, activities, events, car rentals, lodging) straight out of a Gmail
inbox, and show a real photo of the exact venue for every item — a real
Google Places photo when one exists, falling back to a Street View shot of
the exact address.

It ships with your actual upcoming Grand Cayman trip (Oct 2026), built from
your real booking confirmation emails — not placeholder data. Click **"Add
my Grand Cayman trip"** on the home page to load it in.

## Quick start

Requires a Postgres database ([Neon](https://neon.tech) is what this project
uses, but any Postgres works). Set `DATABASE_URL` in `.env` to its connection
string, then:

```bash
npm install
npx prisma migrate deploy   # applies migrations to your Postgres database
npm run dev                 # http://localhost:3000
```

Open http://localhost:3000, click **"Add my Grand Cayman trip"** on the
home page (or create another trip), and click into it.

## What works out of the box (no setup)

- Creating trips and itinerary items (activities, events, dinners, lodging,
  transport) with times, addresses, party size, notes, confirmation numbers.
- A day-by-day itinerary timeline.
- "Import from Gmail" — until a live Gmail connection is configured, it
  shows the 4 real bookings the Grand Cayman trip was already built from
  (so nothing to scan for yet, but you can see the review-and-import flow
  end to end); once connected, it scans your actual inbox for anything new.
- The Grand Cayman trip's real photos (The Cracked Conch, NOVA, and
  Casanova By The Sea, plus the Cayman Islands tourism board's Seven Mile
  Beach cover photo, and an actual photo of the Kia K3 rental).
- Every address has an "Open in Google Maps" link (a plain maps.google.com
  search link — no API key needed), including the rental car pickup.
- **Sharing a trip** — the "Share" button on a trip page generates a
  read-only link (`/share/<token>`) anyone can open without an account.
  They see only that one trip's itinerary, with no way to browse into your
  other trips or Settings. "Stop sharing" revokes the link immediately.

## What needs your own API keys

Everything below is configured from the in-app **Settings** page — nothing
needs to be edited in code.

### 1. Real location photos (Google Maps Platform)

1. In the [Google Cloud Console](https://console.cloud.google.com/), create
   (or reuse) a project, and enable:
   - **Places API**
   - **Street View Static API**
   - **Geocoding API**
2. Create an API key (APIs & Services → Credentials → Create Credentials →
   API key). For a server-side key like this one, you can restrict it by
   API rather than by HTTP referrer.
3. Paste it into Settings → "Google Maps API key" and save.

Once set, every new itinerary item you add (manually or via Gmail import)
will automatically get a real photo of the venue, or a Street View photo of
its exact address if Google doesn't have a dedicated photo. Existing items
without a photo show a **"Try to find one"** link to backfill them.

### 2. Gmail import (live inbox)

The Gmail connection here is the app's own — separate from any Gmail
access you might use elsewhere (like inside Claude). To connect a real
inbox:

1. In the Google Cloud Console, enable the **Gmail API**.
2. Configure the OAuth consent screen (External is fine for personal use;
   add your own Gmail address as a test user if the app is in "Testing"
   mode).
3. Create an OAuth Client ID of type **Web application**. Add this app's
   callback URL as an authorized redirect URI:
   - Local dev: `http://localhost:3000/api/gmail/callback`
   - Deployed: `https://<your-domain>/api/gmail/callback`
4. Paste the Client ID and Client Secret into Settings → "Gmail import"
   and save, then click **Connect Gmail** and sign in with the account you
   want the app to scan (e.g. acozztravel@gmail.com).

Once connected, "Import from Gmail" scans for booking/reservation-style
emails (OpenTable, Sixt, Airbnb, Resy, Viator, Eventbrite, plus a generic
keyword match for everything else), parses out the venue, date/time,
address, party size and confirmation number, and lets you review each one
before adding it to a trip. Emails you import or dismiss won't be
suggested again.

### 3. Smarter email parsing (optional, uses a Claude API key)

Well-known senders (OpenTable, Sixt) are parsed with pattern matching and
need no key. Everything else — a personal reservation email from a small
restaurant, an unusual confirmation format — falls back to a best-effort
generic parser. Adding an Anthropic (Claude) API key in Settings swaps that
fallback for an actual Claude call that reads the email and extracts
structured booking details, which is far more reliable for messy,
non-templated emails.

## How it's built

- **Next.js (App Router)** — single app, frontend + API routes together.
- **Prisma + Postgres** for storage (`prisma/schema.prisma`). Trip →
  ItineraryItem, plus a single-row Settings table and an ImportedEmail
  table that tracks which Gmail messages have already been reviewed.
- **`lib/gmailParsers.js`** — the email → structured-booking heuristics
  (OpenTable, Sixt, generic fallback), unit-testable independent of Gmail.
- **`lib/gmail.js`** — Gmail OAuth + the live inbox scan, plus the optional
  Claude-assisted generic parser.
- **`lib/photos.js`** — Google Places → Street View photo resolution.
- **`lib/demoData.js`** — the real sample Grand Cayman trip used for demo
  mode and the empty-state seed button.

### A note on times

There's no per-item real timezone concept in this version — an itinerary
item's time is stored as the *destination's own wall-clock time* (e.g.
"6:30pm in Grand Cayman"), using UTC only as a storage placeholder, not a
true UTC conversion. Every display spot formats these back out with
`timeZone: "UTC"` explicitly so the original time always shows correctly no
matter what timezone the person viewing it is in. If you want per-item real
timezones (e.g. showing "your local time" conversions), that would mean
storing an IANA timezone alongside each item and using a library like
`date-fns-tz` to convert.

## Deploying for real

Already live at **acozztravel.com** on Vercel, backed by a Neon Postgres
database — see [DEPLOY.md](./DEPLOY.md) for how that was originally set up
(useful if you ever need to redo it from scratch, e.g. a new environment).

Ongoing deploys are just `git push` to `main` — Vercel auto-builds and
redeploys. The build only runs `prisma generate` (see `package.json`), not
`migrate deploy`, so a schema change needs one extra manual step: generate
the migration locally (`npx prisma migrate dev --name <description>`,
ideally against a separate dev database), commit the new
`prisma/migrations/` folder, then run `npx prisma migrate deploy` yourself
against the production `DATABASE_URL` before or right after pushing, so the
live database's schema doesn't lag behind the deployed code.
