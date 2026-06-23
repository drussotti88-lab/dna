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
