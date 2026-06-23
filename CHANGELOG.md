# Changelog

_User-facing. Plain, direct, a little proud — written for a collector, not a developer._

## v0.5.0 — Intelligence (2026-06-23)
The part no spreadsheet can do. These are market-data tools, not financial advice.

- **Vault Picks** — grading-flip opportunities ranked by expected value after fees, with momentum at
  a glance and a one-line thesis on each.
- **Grading Lab** — a full table of what&apos;s +EV to send in: raw price, expected PSA value, fee,
  net EV, ROI, and whether the math is backed by real graded prices or estimated.
- **Intel** — what&apos;s heating up and cooling off over 30 days, plus a short market pulse (written
  by AI when configured, with a sensible fallback otherwise).
- **Vault Score** — a single 0–100 read on each card blending value, momentum, liquidity, and
  grading upside, shown right on the card page.

_All of this is built on the shared price + trend + sold-comp store, so it gets sharper as more
cards enter the vault._

## v0.4.0 — Import & scan (2026-06-23)
Two fast ways to get your cards in.

- **CSV import** — drop in a Collectr (or similar) export and we resolve every card to its catalog
  entry, pulling in image, id, and price. Anything we&apos;re not confident about is flagged "needs
  review" rather than guessed — so a wrong card never slips in silently. Big files import in batches
  with a running tally of added / review / unresolved.
- **Camera scan** — point your camera at a card (English or Japanese) and we identify it, translate
  the name, and show catalog matches to add in a tap. You can also upload a photo.
- **Centering calculator** — punch in the border widths to get a centering read, one of the biggest
  factors in a grade.

## v0.3.0 — Your collection (2026-06-23)
The vault is now yours. Sign in and start tracking what you own.

- **Sign in** — email + password or a one-tap email link. Your data is private to you.
- **Add copies** — from any card, add a raw or graded copy with quantity, cost, and the date you got
  it, into a portfolio. The card's full details and prices are pulled into your vault automatically
  the moment you add it.
- **Portfolios** — group your cards however you like; a default collection is created for you.
- **Collection view** — total value, cost basis, and profit/loss at a glance, plus a filterable,
  sortable grid of everything you own. Flag and filter copies that need review.
- **Trustworthy numbers** — every value is read from one price store and run through one pricing
  brain, so what you see in your collection matches the card pages exactly.

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
