# Deploying A.Cozz Travel to a real domain

This walks through getting the app live on the public internet at your own
domain, using Vercel (hosting) + a Postgres database (Vercel's own, backed by
Neon, is the path of least resistance) + your existing domain's DNS.

Total time if you're doing this for the first time: 30–45 minutes, most of
which is waiting for DNS to propagate.

---

## 0. Current status

This has already been done once: the app is live at **acozztravel.com**,
`prisma/schema.prisma` is already on `provider = "postgresql"`, and
`prisma/migrations/` already contains Postgres migrations applied to a real
Neon database. This walkthrough is kept for reference — e.g. if you're
setting up a brand-new environment (a second Vercel project, a staging
database) from this same codebase. In that case skip step 3b's schema/
migration-file changes (already done) and just point a fresh `DATABASE_URL`
at your new Postgres instance, then run `npx prisma migrate deploy` (not
`migrate dev --name init`) to apply the existing migrations to it.

---

## 1. Push the code to GitHub

Already done — this repo's `origin` remote points at
`github.com/acozzrei/acozz-travel`, and Vercel auto-deploys on every push to
`main`. (If you're ever setting this up fresh against a new repo: create an
empty one on GitHub, `git remote add origin <url>`, `git push -u origin
main`. `.gitignore` already excludes `node_modules/`, `.next/`, and `.env*`
— there's no `prisma/dev.db` anymore since the SQLite prototype was
retired.)

---

## 2. Create the Vercel project

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub login is
   easiest since that's where the code lives).
2. **Add New → Project**, select the GitHub repo you just pushed.
3. Framework Preset should auto-detect as **Next.js**. Leave the build
   command and output directory as the defaults.
4. Don't click Deploy just yet — first set up the database in the next
   section, since the app needs `DATABASE_URL` to build/run correctly.

---

## 3. Set up Postgres and switch the schema over

### 3a. Provision a Postgres database

The simplest path: from your new Vercel project → **Storage** tab → **Create
Database** → **Postgres** (this provisions a Neon-backed Postgres instance
and wires the connection strings into your project automatically as
environment variables — no manual copy-pasting needed).

If you'd rather use a database you already run elsewhere (Supabase, Neon
directly, RDS, etc.), that's fine too — you'll just add `DATABASE_URL`
manually as an environment variable in step 3c.

### 3b. Apply the existing migrations to your Postgres database

`prisma/schema.prisma` is already `provider = "postgresql"`, and
`prisma/migrations/` already has the full set of Postgres migrations
(`Trip`, `ItineraryItem`, `Settings`, `ImportedEmail`, plus the later
share-password/slug/master-password additions) — nothing to change in code.

Set your local shell's `DATABASE_URL` to the Postgres connection string for
the database you're targeting (Storage tab → your database → `.env.local`
tab has a copy-pasteable value — grab the one ending in `?sslmode=require`),
then apply the existing migrations to it:

```bash
export DATABASE_URL="postgres://...your-connection-string...?sslmode=require"
npx prisma migrate deploy
```

This runs the existing migration files against that database — no new
migration to generate or commit for this step.

### 3c. Environment variables in Vercel

If you used Vercel's own Postgres integration (3a), `DATABASE_URL` is
already set for you — check Project → Settings → Environment Variables to
confirm it's there for the **Production** environment.

If you used your own Postgres provider, add it manually there:
- Key: `DATABASE_URL`
- Value: your connection string
- Environment: Production (and Preview, if you want preview deploys to work
  too — you may want a separate database for those so preview branches don't
  write into your real data)

Nothing else needs an environment variable. The Google Maps API key, Gmail
OAuth Client ID/Secret, and Anthropic API key all live in the app's own
**Settings** page (stored in the database), not as Vercel env vars — you'll
re-enter those once the app is live.

---

## 4. Deploy

Back in the Vercel project, click **Deploy**. Vercel will run `npm install`,
`npx prisma generate`, and `npm run build`. First deploy takes a couple of
minutes. When it finishes you'll get a `*.vercel.app` URL that already
works — that's a good moment to click into it and confirm the home page
loads before moving on to the custom domain.

---

## 5. Point acozztravel.com at it

Your domain is **acozztravel.com** — a bare/apex domain (no subdomain), so
here's the concrete version:

1. In the Vercel project → **Settings → Domains**, type in `acozztravel.com`
   and click **Add**. While you're there, also add `www.acozztravel.com` —
   Vercel will offer to redirect one to the other automatically, so pick
   whichever you want to be the "main" version (most people redirect `www`
   → the bare domain, or vice versa; either works).
2. Vercel will show you the exact records to create. For the apex domain
   itself, that's an **A record**:
   - Type: `A`
   - Name/Host: `@` (or leave blank, depending on your registrar's UI)
   - Value: `76.76.21.21`
   For `www.acozztravel.com`, it'll be a **CNAME record**:
   - Type: `CNAME`
   - Name/Host: `www`
   - Value: `cname.vercel-dns.com`
   Use whatever values Vercel's own Domains screen shows at the time — this
   is the current standard, but double-check against the live screen since
   Vercel does occasionally change its infrastructure IPs.
3. Log into wherever acozztravel.com is registered (or wherever its DNS is
   managed, if that's different — e.g. Cloudflare) and add those two
   records under that domain's DNS settings.
4. Back in Vercel, the Domains tab shows "Invalid Configuration" until the
   DNS change propagates, then flips to a green checkmark with a free SSL
   certificate issued automatically. Usually minutes; can take a few hours
   depending on your registrar's TTL settings.
5. Once that's live, go back to the Gmail OAuth Client in Google Cloud
   Console (step 6 below) and use `https://acozztravel.com/api/gmail/callback`
   as the exact redirect URI.

---

## 6. Point Gmail's OAuth Client at the real domain

The Gmail import feature needs its OAuth redirect URI updated once you have
a real domain (it was previously only configured for `localhost`):

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs &
   Services → Credentials → your OAuth 2.0 Client ID.
2. Under **Authorized redirect URIs**, add:
   `https://acozztravel.com/api/gmail/callback`
   (keep the localhost one too if you still want to test locally sometimes).
3. Save.
4. In the deployed app's Settings page, re-enter the Client ID/Secret if you
   haven't already, and click **Connect Gmail** again — the app is a fresh
   database, so the connection needs to happen once against production too.

---

## 7. Add your Grand Cayman trip and your API keys

The production database starts empty — this is not optional cleanup, the
Grand Cayman trip is a real upcoming trip and needs to actually exist on
the live site for it to be useful:

- On the live site's home page, click **"Add my Grand Cayman trip"**. This
  loads the same real itinerary (the four real bookings, real photos,
  the researched rental car pickup instructions) into the production
  database — it's not placeholder content, it's your actual trip, just
  not yet present in this fresh database until you click it.
- Then set your Google Maps / Gmail / Claude API keys in Settings (these
  are per-database, so they need to be entered again in production — they
  don't carry over from local dev), and connect Gmail again so live import
  works against acozztravel.com.
- If you want to share the trip once it's live, hit **Share** on the trip
  page — that link will only work once the trip actually exists in
  production, so do this after the step above, not before.

---

## Ongoing deploys

Once this is set up, every `git push` to `main` triggers a new Vercel
deploy automatically. If you ever change `prisma/schema.prisma` again,
run `npx prisma migrate dev --name <description>` locally against your
**production** `DATABASE_URL` (or, safer, against a separate dev database
and then `npx prisma migrate deploy` against production) before pushing,
so the live database's schema stays in sync with the code being deployed.
