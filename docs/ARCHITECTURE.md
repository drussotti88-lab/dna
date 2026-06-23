# DNA Card Vault — Architecture (approved 2026-06-23)

The clean end-state, built directly. This is the contract every feature follows. It exists so we
never re-walk the old codebase's pathways (cross-source matchers, a grafted price mirror, per-call
pricing, a dual image path, card-vs-item ambiguity).

## Domain model — four explicit entities
- **Card** — a catalog entry, identified by its **Scrydex id** (e.g. `sv8-123`, `sm0_ja-4`). This id
  is THE id the whole app uses: adding, viewing, re-matching, pricing, and history all key off it.
- **Variant** — a printing of a card (Holofoil, Reverse, etc.). First-class and clearly labeled.
  Non-standard product forms (jumbo, metal, box-topper) are flagged `is_special_format` and never
  become a card's default price.
- **Item** — one *owned* copy: portfolio, raw/graded, condition/grade/cert, quantity, cost, acquired
  date. Always references a `card_id`.
- **Portfolio** — a named bucket of items with its own value and P/L.

Routes follow the model: a **Card page** shows the catalog + all your copies; an **Item page**
manages one copy. No overlap, no ambiguity.

## One pricing service (`lib/pricing.js`)
`value(card, { variant, graded, company, grade })` is the only place the value ladder lives:
1. raw = Scrydex `market`
2. graded = Scrydex per-grade `market` → PriceCharting gap-fill (later phase, Dan-approved) →
   raw × grade-multiplier **estimate** (clearly labeled)
3. TAG grades → priced at the matching PSA grade, flagged with a UI notice

Currency is already USD here — **JPY→USD is done at ingestion** in `lib/scrydex.js`. Item pages,
refresh jobs, and intelligence all call `value()` identically. No per-caller re-derivation.

## One money formatter (`lib/format.js`)
`fmtUSD` — USD, 2 decimals + separators. Every dollar amount goes through it. No raw `toFixed`.

## Canonical data layer (`lib/scrydex.js`)
The single wrapper around Scrydex: search (forgiving Lucene query + relevance rank), get-card,
set-cards, listings (real eBay sold comps). Normalizes to one internal `Card` shape with USD prices.
No other catalog source for Scrydex games; MTG/YGO will sit behind the same interface.

Auth facts: `X-Api-Key` + `X-Team-ID = dna` (lowercase). Prices are credit-gated via
`?include=prices`. JA (Pokémon) prices are JPY; EN are USD.

## Catalog + price store (Postgres / Supabase) — ONE read path
Designed on purpose (`supabase/schema.sql`):
- `sets`, `cards` (catalog), `card_variants` (printings), `card_prices` (raw + every graded tier +
  trends, USD, `as_of`), `sold_comps` (real sold history + velocity).
- The app **only reads from this store.** Daily plan-safe cron + lazy fill keep it fresh.
- Not "mirror sometimes, live other times" — one designed path.

## Images — one path
Self-host card art to our Supabase CDN at ingestion; reference our URL everywhere. Lists never block
on images and never show a broken one (placeholder fallback). Proxy is a transient fallback only.

## Plan-safe ops
Daily-only Vercel crons, route `maxDuration ≤ 60` (Vercel silently freezes deploys that exceed plan
limits). Every release bumps `lib/version.js` + adds a plain-language `CHANGELOG.md` entry.
`GET /api/version` vs the built version detects a stuck deploy.

## Build order (tracker-first)
1. **Foundation** (this) — schema, Scrydex wrapper, pricing service, formatter, guardrails.
2. **Browse + Card page** — search, result grid, universal card view (value, chart, comps).
3. **Ownership** — auth, add-a-copy, portfolios, collection, P/L + value-over-time.
4. **Import + Scan** — Collectr CSV (lands complete, fixable), camera scanner.
5. **Intelligence** — Vault Picks, Grading Lab, Intel, Vault Score (on the sold-comp + trend store).
6. **Social/marketplace + monetization** — profiles, listings, offers/trades, Patreon, coins.
