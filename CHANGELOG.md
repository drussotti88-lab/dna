# Changelog

_User-facing. Plain, direct, a little proud — written for a collector, not a developer._

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
