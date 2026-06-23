# DNA Card Vault

The serious collector's command center for trading cards as assets — track what you own across
every TCG, value it accurately, and get real investment intelligence.

This is the **clean rebuild** (Pokémon-first, multi-TCG). It is built to the end-state architecture
from day one — see `docs/ARCHITECTURE.md`.

## Stack
- **Next.js 16** (App Router, **plain JavaScript — no TypeScript**) + **React 19**
- **Supabase** (Postgres + Auth + Storage, RLS on)
- **Scrydex** — canonical catalog + price source of truth
- **Vercel** — auto-deploy on `main`
- **Anthropic** — scanner vision + AI summaries

## Getting started
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in values.
3. Apply `supabase/schema.sql` in the Supabase SQL editor.
4. `npm run dev` and open http://localhost:3000

## Conventions (non-negotiable)
- **One canonical card id everywhere = the Scrydex id.** No internal source-to-source matching.
- **One money formatter** (`lib/format.js`) — USD, 2 decimals + separators. JPY→USD at ingestion.
- **One pricing service** (`lib/pricing.js`) — single fallback ladder, no per-caller re-derivation.
- **One read path** — the app reads the Postgres catalog/price store; jobs keep it fresh.
- **One image path** — self-host card art to our CDN at ingestion; proxy only as fallback.
- **Plan-safe Vercel ops** — daily crons, route `maxDuration ≤ 60`. Bump version + changelog per release.

## Deploy health check
Compare live `GET /api/version` to the built version in `lib/version.js`. If they differ, deploys are
silently failing (a Vercel plan-limit trap) — check the Vercel Deployments tab.
