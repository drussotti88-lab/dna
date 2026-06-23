// ============================================================================
// lib/intel.js — the intelligence engine. Pure functions over the normalized
// Card shape (built from the price/trend/sold-comp store). The differentiator:
// grading-flip EV, momentum, velocity, and a composite Vault Score.
//
// These are MARKET-DATA TOOLS, not financial advice — surfaces should frame them
// that way (no "buy this").
// ============================================================================

import { value, isSpecialFormat } from "@/lib/pricing";

// Default grading economics (configurable later via settings).
export const GRADING_FEE = 25; // per card, bulk-ish
// Outcome distribution for a "gradeable" raw card (rough prior; refine with pops).
const GRADE_DIST = [
  { grade: 10, p: 0.3 },
  { grade: 9, p: 0.45 },
  { grade: 8, p: 0.2 },
];

function defaultVariant(card) {
  return (card.variants || []).find((v) => !isSpecialFormat(v)) || card.variants?.[0] || null;
}

export function rawValue(card) {
  const v = defaultVariant(card);
  return value(card, { variant: v?.key }).amount ?? null;
}

// Expected graded value across the outcome distribution (USD).
export function expectedGradedValue(card, company = "PSA") {
  const v = defaultVariant(card);
  let ev = 0;
  let known = 0;
  for (const { grade, p } of GRADE_DIST) {
    const gv = value(card, { variant: v?.key, graded: true, company, grade });
    if (gv.amount != null) {
      ev += gv.amount * p;
      if (gv.source !== "estimate") known += p;
    }
  }
  return { ev, dataQuality: known }; // dataQuality 0..1 = share from real prices
}

// Grading-flip EV: expected graded value minus fee minus the raw you give up.
export function gradingFlipEV(card, { company = "PSA", fee = GRADING_FEE } = {}) {
  const raw = rawValue(card);
  if (raw == null) return null;
  const { ev, dataQuality } = expectedGradedValue(card, company);
  if (!ev) return null;
  const net = ev - fee - raw;
  return {
    raw,
    expectedGraded: ev,
    fee,
    net,
    roi: raw > 0 ? net / (raw + fee) : null,
    confidence: dataQuality, // higher = more of the EV came from real graded prices
    company,
  };
}

// Momentum from trends (30d percent change on the default raw price).
export function momentum(card) {
  const v = defaultVariant(card);
  const raw = (v?.prices || []).find((p) => p.type === "raw");
  const t = raw?.trends || {};
  return {
    d7: t.days_7?.percent_change ?? null,
    d30: t.days_30?.percent_change ?? null,
    d90: t.days_90?.percent_change ?? null,
  };
}

// Velocity from sold comps (count in window). comps: [{sold_at}]
export function velocity(comps, days = 30) {
  if (!comps?.length) return 0;
  const cutoff = Date.now() - days * 86400000;
  return comps.filter((c) => new Date(c.sold_at || c.soldAt).getTime() >= cutoff).length;
}

// Composite Vault Score (0..100): blends value, momentum, liquidity, data quality.
export function vaultScore(card, { comps = [] } = {}) {
  const raw = rawValue(card) || 0;
  const m = momentum(card);
  const vel = velocity(comps, 90);

  const valueScore = Math.min(1, Math.log10(1 + raw) / 3); // ~ $1k -> ~1
  const momScore = clamp01(0.5 + (m.d30 ?? 0) / 100); // +50% -> 1, -50% -> 0
  const liqScore = Math.min(1, vel / 20); // 20 sales/90d -> 1
  const flip = gradingFlipEV(card);
  const flipScore = flip && flip.roi != null ? clamp01(flip.roi) : 0;

  const score =
    valueScore * 25 + momScore * 30 + liqScore * 25 + flipScore * 20;
  return Math.round(score);
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

// Rank cards as grading-flip opportunities (Vault Picks / Grading Lab).
export function rankGradingFlips(cards, { company = "PSA", minNet = 10 } = {}) {
  return cards
    .map((card) => ({ card, ev: gradingFlipEV(card, { company }), mom: momentum(card) }))
    .filter((x) => x.ev && x.ev.net >= minNet)
    .sort((a, b) => b.ev.net - a.ev.net);
}

// Top movers by 30d momentum (Intel).
export function topMovers(cards, dir = "up", limit = 12) {
  return cards
    .map((card) => ({ card, m: momentum(card) }))
    .filter((x) => x.m.d30 != null && rawValue(x.card))
    .sort((a, b) => (dir === "up" ? b.m.d30 - a.m.d30 : a.m.d30 - b.m.d30))
    .slice(0, limit);
}
