-- ============================================================================
-- DNA Card Vault — Database schema (clean rebuild)
-- Apply by hand in the Supabase SQL editor. Destructive ops on prod need Dan's OK.
--
-- Domain model: Card -> Variant -> Item (owned copy) -> Portfolio.
-- Card identity = the Scrydex id everywhere (e.g. 'sv8-123', 'sm0_ja-4'). No
-- internal source-to-source matching. The only matching that ever exists is the
-- one-time CSV-import resolve.
--
-- The catalog/price store is designed ON PURPOSE with ONE read path: the app
-- reads these tables; daily jobs + lazy fill keep them fresh. Prices are stored
-- already normalized to USD (JPY converted at ingestion).
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";  -- forgiving name search (trigram index)

-- ---------------------------------------------------------------------------
-- CATALOG (public read; written only by server/service-role ingestion jobs)
-- ---------------------------------------------------------------------------

create table if not exists sets (
  id          text primary key,             -- Scrydex expansion id
  game        text not null,                -- pokemon | onepiece | lorcana | gundam | riftbound
  lang        text not null default 'en',   -- en | ja
  name        text not null,
  series      text,                         -- e.g. 'Pokémon TCG Pocket'
  printed_total integer,
  release_date date,
  images      jsonb,
  updated_at  timestamptz not null default now()
);

create table if not exists cards (
  id          text primary key,             -- THE canonical id = Scrydex id
  game        text not null,
  lang        text not null default 'en',
  name        text not null,
  number      text,                         -- card number within set
  set_id      text references sets(id),
  rarity      text,
  artist      text,
  images      jsonb,                         -- {small,large} self-hosted CDN urls
  expansion   jsonb,
  raw         jsonb,                         -- full normalized Scrydex catalog payload
  updated_at  timestamptz not null default now()
);
create index if not exists cards_game_idx on cards (game);
create index if not exists cards_set_idx on cards (set_id);
create index if not exists cards_name_trgm_idx on cards using gin (lower(name) gin_trgm_ops);

-- Variants (printings) are first-class. is_special_format separates non-standard
-- product forms (jumbo, metal, box-topper) so they never become a card's default.
create table if not exists card_variants (
  id            uuid primary key default gen_random_uuid(),
  card_id       text not null references cards(id) on delete cascade,
  variant_key   text not null,              -- 'holofoil' | 'reverse' | 'normal' | ...
  label         text not null,              -- display label
  is_special_format boolean not null default false,
  sort          integer not null default 0,
  unique (card_id, variant_key)
);
create index if not exists card_variants_card_idx on card_variants (card_id);

-- One row per card + variant + price-kind (raw, or graded company/grade).
-- All money is USD; as_of marks freshness. trends carries built-in momentum.
create table if not exists card_prices (
  id          uuid primary key default gen_random_uuid(),
  card_id     text not null references cards(id) on delete cascade,
  variant_key text not null default 'normal',
  type        text not null,                -- 'raw' | 'graded'
  condition   text,                          -- raw condition (e.g. 'NM')
  company     text,                          -- graded: PSA | CGC | BGS | TAG | ...
  grade       numeric,                       -- graded: 10, 9.5, ...
  low         numeric,
  mid         numeric,
  high        numeric,
  market      numeric,                       -- the headline value (USD)
  source      text not null default 'scrydex', -- scrydex | pricecharting | estimate | tcgcsv
  currency    text not null default 'USD',
  trends      jsonb,                          -- {days_1,days_7,...:{price_change,percent_change}}
  as_of       timestamptz not null default now(),
  unique (card_id, variant_key, type, company, grade)
);
create index if not exists card_prices_card_idx on card_prices (card_id);

-- Real eBay sold comps (from Scrydex listings) -> deep history + velocity.
create table if not exists sold_comps (
  id          uuid primary key default gen_random_uuid(),
  card_id     text not null references cards(id) on delete cascade,
  variant_key text,
  company     text,
  grade       numeric,
  price_usd   numeric not null,
  sold_at     timestamptz not null,
  source      text not null default 'scrydex',
  external_id text,
  unique (card_id, external_id)
);
create index if not exists sold_comps_card_idx on sold_comps (card_id, sold_at desc);

-- ---------------------------------------------------------------------------
-- USER DATA (RLS: each user sees only their own)
-- ---------------------------------------------------------------------------

create table if not exists portfolios (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists portfolios_user_idx on portfolios (user_id);

-- Item = one owned copy (raw or graded), keyed off the canonical card_id.
create table if not exists items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  portfolio_id uuid not null references portfolios(id) on delete cascade,
  card_id      text not null references cards(id),
  variant_key  text not null default 'normal',
  type         text not null default 'raw',  -- 'raw' | 'graded' | 'sealed'
  condition    text,
  company      text,                          -- graded
  grade        numeric,                       -- graded
  cert         text,                          -- graded cert number
  quantity     integer not null default 1,
  cost_usd     numeric,                       -- purchase price per copy (USD)
  acquired_at  date,
  needs_review boolean not null default false,
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists items_user_idx on items (user_id);
create index if not exists items_portfolio_idx on items (portfolio_id);
create index if not exists items_card_idx on items (card_id);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

-- Catalog: public read; writes only via service-role (which bypasses RLS).
alter table sets           enable row level security;
alter table cards          enable row level security;
alter table card_variants  enable row level security;
alter table card_prices    enable row level security;
alter table sold_comps     enable row level security;

drop policy if exists "catalog read sets" on sets;
drop policy if exists "catalog read cards" on cards;
drop policy if exists "catalog read variants" on card_variants;
drop policy if exists "catalog read prices" on card_prices;
drop policy if exists "catalog read comps" on sold_comps;
create policy "catalog read sets"     on sets          for select using (true);
create policy "catalog read cards"    on cards         for select using (true);
create policy "catalog read variants" on card_variants for select using (true);
create policy "catalog read prices"   on card_prices   for select using (true);
create policy "catalog read comps"    on sold_comps    for select using (true);

-- User data: owner-only for all operations.
alter table portfolios enable row level security;
alter table items      enable row level security;

drop policy if exists "own portfolios" on portfolios;
drop policy if exists "own items" on items;
create policy "own portfolios" on portfolios
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own items" on items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- ============================================================================
-- DNA Card Vault — Social / marketplace / monetization (Phase 6)
-- Apply AFTER schema.sql. Destructive ops on prod need Dan's OK.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---- Profiles (public-facing identity) -------------------------------------
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  handle        text unique,
  display_name  text,
  bio           text,
  avatar_url    text,
  is_public     boolean not null default false,
  vault_coins   integer not null default 0,
  supporter     boolean not null default false,
  supporter_until timestamptz,
  patreon_id    text,
  created_at    timestamptz not null default now()
);

-- ---- Marketplace listings --------------------------------------------------
create table if not exists listings (
  id          uuid primary key default gen_random_uuid(),
  seller_id   uuid not null references auth.users(id) on delete cascade,
  item_id     uuid references items(id) on delete set null,
  card_id     text not null references cards(id),
  variant_key text not null default 'normal',
  type        text not null default 'raw',
  company     text,
  grade       numeric,
  price_usd   numeric not null,
  currency    text not null default 'USD',
  status      text not null default 'active',  -- active | sold | cancelled
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists listings_status_idx on listings (status, created_at desc);
create index if not exists listings_seller_idx on listings (seller_id);

-- ---- Offers ----------------------------------------------------------------
create table if not exists offers (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references listings(id) on delete cascade,
  buyer_id    uuid not null references auth.users(id) on delete cascade,
  amount_usd  numeric not null,
  message     text,
  status      text not null default 'pending', -- pending|accepted|declined|withdrawn
  created_at  timestamptz not null default now()
);
create index if not exists offers_listing_idx on offers (listing_id);
create index if not exists offers_buyer_idx on offers (buyer_id);

-- ---- Reviews / trust -------------------------------------------------------
create table if not exists reviews (
  id              uuid primary key default gen_random_uuid(),
  subject_user_id uuid not null references auth.users(id) on delete cascade,
  author_id       uuid not null references auth.users(id) on delete cascade,
  rating          integer not null check (rating between 1 and 5),
  body            text,
  created_at      timestamptz not null default now(),
  unique (subject_user_id, author_id)
);
create index if not exists reviews_subject_idx on reviews (subject_user_id);

-- ---- RLS -------------------------------------------------------------------
alter table profiles enable row level security;
alter table listings enable row level security;
alter table offers   enable row level security;
alter table reviews  enable row level security;

drop policy if exists "profiles read" on profiles;
drop policy if exists "profiles upsert own" on profiles;
drop policy if exists "profiles update own" on profiles;
create policy "profiles read" on profiles for select using (true);
create policy "profiles upsert own" on profiles for insert with check (auth.uid() = id);
create policy "profiles update own" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "listings read" on listings;
drop policy if exists "listings write own" on listings;
create policy "listings read" on listings
  for select using (status = 'active' or auth.uid() = seller_id);
create policy "listings write own" on listings
  for all using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

drop policy if exists "offers read party" on offers;
drop policy if exists "offers insert buyer" on offers;
drop policy if exists "offers update party" on offers;
create policy "offers read party" on offers for select using (
  auth.uid() = buyer_id
  or auth.uid() in (select seller_id from listings where listings.id = offers.listing_id)
);
create policy "offers insert buyer" on offers for insert with check (auth.uid() = buyer_id);
create policy "offers update party" on offers for update using (
  auth.uid() = buyer_id
  or auth.uid() in (select seller_id from listings where listings.id = offers.listing_id)
);

drop policy if exists "reviews read" on reviews;
drop policy if exists "reviews write own" on reviews;
create policy "reviews read" on reviews for select using (true);
create policy "reviews write own" on reviews
  for all using (auth.uid() = author_id) with check (auth.uid() = author_id);
