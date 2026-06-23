# Changelog

_User-facing. Plain, direct, a little proud — written for a collector, not a developer._

## v0.2.0 — Browse & the Card page (2026-06-23)
You can now actually look things up. This is the first release you can click around in.

- **Browse & search** — one forgiving search bar across all games, with the Pokémon EN / 日本語
  toggle. Type a name, an artist, or a card number; closest matches come first.
- **The result grid** — clean card tiles with the printing chip and price, the art front and center.
- **Filter & sort** — narrow by rarity and sort by price or name once results are in.
- **The Card page** — every printing of a card in one place: big hero art, a printing selector
  (standard printings, with oddball formats kept separate), the headline market value with its
  source, a raw/graded toggle, a price-history chart from real sold sales, recent sold comps, and a
  grade calculator showing what each grade is worth versus raw.
- **The app shell** — the left sidebar nav (Browse, Collection, Vault Picks, Grading Lab, Intel) and
  the version stamp in the corner.

_Note: adding your own copies needs sign-in, which lands next phase. Card data requires the Scrydex
key to be set in the environment._

## v0.1.0 — Foundation (2026-06-23)
The clean rebuild begins. This release is the spine the whole app hangs off — nothing flashy yet,
but everything built correctly from the start so we never inherit the old tangles.

- **One card identity everywhere** — every card is keyed off its Scrydex id. No more guessing which
  page or id is the "real" one.
- **One price brain** — a single pricing service with one clear fallback ladder (Scrydex first), so
  numbers are consistent no matter where you see them.
- **One money format** — every dollar amount goes through a single formatter. No stray rounding.
- **Prices land in dollars** — Japanese (yen) prices are converted to USD the moment they come in.
- **The vault look** — the dark, jewel-toned design system (three typefaces, themeable accents).
- **Safe shipping** — daily-only background jobs and short request limits so deploys never silently
  freeze; a version stamp you can check to confirm the live site is current.
