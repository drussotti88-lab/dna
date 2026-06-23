// ============================================================================
// lib/scrydex.js — the ONE wrapper around Scrydex (canonical catalog + prices).
//
// Domain truths baked in (from the rebuild brief, verified against live API):
//  - Base: https://api.scrydex.com/{game}/v1/{lang}/...
//  - Auth: X-Api-Key + X-Team-ID = 'dna' (LOWERCASE; uppercase 401s).
//  - Prices/pops are credit-gated via ?include=prices.
//  - Card identity = Scrydex id. This is THE id the whole app uses.
//  - JA (Pokémon) prices are in JPY -> we convert to USD here, at ingestion.
//  - Search query language (Lucene-ish): (name:*term* OR artist:*term*) per word,
//    grouped; number:N; AND by space. pageSize up to ~250 returns a full set.
//
// This module returns a single internal `Card` shape with USD prices. Nothing
// else in the app talks to Scrydex directly.
// ============================================================================

const BASE = "https://api.scrydex.com";
const GAMES = ["pokemon", "onepiece", "lorcana", "gundam", "riftbound"];

function cfg() {
  return {
    key: process.env.SCRYDEX_API_KEY,
    team: (process.env.SCRYDEX_TEAM_ID || "dna").toLowerCase(), // lowercase or 401
    wantPrices:
      process.env.SCRYDEX_PRICES === "1" || process.env.SCRYDEX_PRICES === "true",
    jpyPerUsd: Number(process.env.SCRYDEX_JPY_PER_USD || 150),
  };
}

function headers() {
  const { key, team } = cfg();
  return { "X-Api-Key": key, "X-Team-ID": team, Accept: "application/json" };
}

async function call(game, lang, path, params = {}) {
  const { wantPrices } = cfg();
  const url = new URL(`${BASE}/${game}/v1/${lang}/${path}`);
  if (wantPrices && params.include === undefined) params.include = "prices";
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { headers: headers(), cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Scrydex ${res.status} ${game}/${lang}/${path} :: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// ---- Search query builder (Lucene-ish) -------------------------------------
// Each word -> (name:*word* OR artist:*word*) grouped; bare digits -> number:N.
// Words are AND-ed by space. Grouping matters: an un-grouped OR misparses.
export function sxBuildQuery(input) {
  const terms = String(input || "").trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return "";
  return terms
    .map((t) => {
      if (/^\d+$/.test(t)) return `number:${t}`;
      const safe = t.replace(/["()]/g, "");
      return `(name:*${safe}* OR artist:*${safe}*)`;
    })
    .join(" ");
}

// Closest names rank first: exact > startsWith > word-boundary > substring.
export function sxRank(cards, input) {
  const q = String(input || "").trim().toLowerCase();
  if (!q) return cards;
  const score = (c) => {
    const n = (c.name || "").toLowerCase();
    if (n === q) return 0;
    if (n.startsWith(q)) return 1;
    if (new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(n)) return 2;
    if (n.includes(q)) return 3;
    return 4;
  };
  return [...cards].sort((a, b) => score(a) - score(b));
}

// ---- Currency: JPY -> USD at ingestion -------------------------------------
function toUsd(amount, currency) {
  if (amount == null) return null;
  if (currency === "JPY") return amount / cfg().jpyPerUsd;
  return amount; // EN prices already USD
}

// ---- Normalize a raw Scrydex card -> internal Card shape (USD prices) -------
// variants[].prices[]:
//   RAW    {type:'raw', condition, low, market, currency, trends}
//   GRADED {type:'graded', company, grade, low, mid, high, market, currency, trends}
export function normalizeCard(raw, game) {
  if (!raw) return null;
  const variants = (raw.variants || []).map((v) => {
    const prices = (v.prices || []).map((p) => ({
      type: p.type,
      condition: p.condition ?? null,
      company: p.company ?? null,
      grade: p.grade ?? null,
      low: toUsd(p.low, p.currency),
      mid: toUsd(p.mid, p.currency),
      high: toUsd(p.high, p.currency),
      market: toUsd(p.market, p.currency),
      currency: "USD",
      origCurrency: p.currency || "USD",
      trends: p.trends ?? null,
    }));
    return {
      key: (v.name || v.variant || "normal").toLowerCase().replace(/\s+/g, "_"),
      label: v.name || v.variant || "Normal",
      prices,
    };
  });

  return {
    id: raw.id, // canonical id — used everywhere
    game: game || raw.game || null,
    lang: raw.id?.includes("_ja") ? "ja" : raw.language || "en",
    name: raw.name,
    number: raw.number ?? null,
    rarity: raw.rarity ?? null,
    artist: raw.artist ?? null,
    setId: raw.expansion?.id ?? raw.set?.id ?? null,
    setName: raw.expansion?.name ?? raw.set?.name ?? null,
    images: {
      small: raw.images?.small ?? raw.image ?? null,
      large: raw.images?.large ?? raw.images?.small ?? null,
    },
    expansion: raw.expansion ?? null,
    variants,
    raw,
  };
}

// ---- Public API ------------------------------------------------------------

export async function searchCards(query, { game = "pokemon", lang = "en", pageSize = 60 } = {}) {
  const q = sxBuildQuery(query);
  const data = await call(game, lang, "cards", { q, pageSize });
  const list = (data.data || data.cards || []).map((c) => normalizeCard(c, game));
  return sxRank(list, query);
}

export async function getCard(id, { game = "pokemon", lang = "en" } = {}) {
  const data = await call(game, lang, `cards/${encodeURIComponent(id)}`);
  const raw = data.data || data.card || data;
  return normalizeCard(raw, game);
}

export async function getSetCards(setId, { game = "pokemon", lang = "en", pageSize = 250 } = {}) {
  const data = await call(game, lang, "cards", { q: `set.id:${setId}`, pageSize });
  return (data.data || data.cards || []).map((c) => normalizeCard(c, game));
}

// Real eBay sold comps with sold_at dates -> velocity + deep history.
export async function getListings(id, { game = "pokemon", lang = "en" } = {}) {
  const data = await call(game, lang, `cards/${encodeURIComponent(id)}/listings`);
  const rows = data.data || data.listings || [];
  return rows.map((l) => ({
    externalId: l.id ?? null,
    priceUsd: toUsd(l.price ?? l.sold_price, l.currency),
    soldAt: l.sold_at ?? l.date ?? null,
    company: l.company ?? null,
    grade: l.grade ?? null,
  }));
}

export { GAMES };
