// ============================================================================
// lib/pricing.js — the ONE pricing service. The value ladder lives ONLY here.
// Item pages, refresh jobs, and intelligence all call value() identically;
// no per-caller re-derivation.
//
// The ladder (from the brief's "value ladder" domain truth):
//   raw     = Scrydex market.
//   graded  = Scrydex per-grade market
//             -> PriceCharting gap-fill for grades Scrydex lacks   (TODO: wire)
//             -> raw x grade-multiplier estimate (last resort).
//   TAG grades aren't in Scrydex/PriceCharting -> price at the matching PSA
//     grade (TAG 10 = PSA 10) and flag it for a UI notice.
//   Currency is already USD here (normalized at ingestion in lib/scrydex.js).
//
// Inputs are the normalized internal Card shape (lib/scrydex.normalizeCard).
// ============================================================================

// Rough raw->graded multipliers, used only when no real graded price exists.
// Deliberately conservative; estimates are clearly labeled to the user.
const GRADE_MULTIPLIER = {
  10: 5.0,
  9.5: 3.0,
  9: 2.2,
  8.5: 1.7,
  8: 1.45,
  7: 1.2,
  6: 1.05,
};

// Non-standard product forms are NOT real printings and must never become a
// card's default price. Keep them grouped separately ("Other formats").
const SPECIAL_FORMAT_RE = /(jumbo|oversize|metal|box ?topper|topper|poster|sticker)/i;

export function isSpecialFormat(variant) {
  const s = `${variant?.label || ""} ${variant?.key || ""}`;
  return SPECIAL_FORMAT_RE.test(s);
}

// TAG grades map 1:1 onto PSA for pricing (and we flag it).
function mapGraderForPricing(company) {
  if (!company) return { company, mapped: false };
  if (company.toUpperCase() === "TAG") return { company: "PSA", mapped: true };
  return { company, mapped: false };
}

function pickVariant(card, variantKey) {
  if (!card?.variants?.length) return null;
  if (!variantKey) {
    // default = first non-special-format variant
    return card.variants.find((v) => !isSpecialFormat(v)) || card.variants[0];
  }
  return card.variants.find((v) => v.key === variantKey) || null;
}

function rawMarket(variant) {
  const p = (variant?.prices || []).find((x) => x.type === "raw");
  return p?.market ?? null;
}

function gradedMarket(variant, company, grade) {
  return (
    (variant?.prices || []).find(
      (x) =>
        x.type === "graded" &&
        (x.company || "").toUpperCase() === (company || "").toUpperCase() &&
        Number(x.grade) === Number(grade)
    ) || null
  );
}

/**
 * value(card, opts) -> {
 *   amount, source, currency:'USD', variantKey, graded, company, grade,
 *   note, trends, isSpecialFormat
 * }
 *  opts: { variant, graded, company, grade }
 */
export function value(card, opts = {}) {
  const variant = pickVariant(card, opts.variant);
  const base = {
    currency: "USD",
    variantKey: variant?.key ?? null,
    graded: !!opts.graded,
    company: opts.company ?? null,
    grade: opts.grade ?? null,
    isSpecialFormat: variant ? isSpecialFormat(variant) : false,
    note: null,
  };

  if (!variant) return { ...base, amount: null, source: "none" };

  // ---- RAW ----
  if (!opts.graded) {
    const raw = (variant.prices || []).find((x) => x.type === "raw");
    return { ...base, amount: raw?.market ?? null, source: raw ? "scrydex" : "none", trends: raw?.trends ?? null };
  }

  // ---- GRADED ----
  const { company: lookupCompany, mapped } = mapGraderForPricing(opts.company);
  const note = mapped ? `${opts.company} priced at the matching PSA grade.` : null;

  // 1) real Scrydex per-grade market
  const g = gradedMarket(variant, lookupCompany, opts.grade);
  if (g?.market != null) {
    return { ...base, amount: g.market, source: "scrydex", note, trends: g.trends ?? null };
  }

  // 2) PriceCharting gap-fill — placeholder hook (wired in a later phase; any
  //    non-Scrydex source must be confirmed with Dan first).
  // const pc = await priceChartingGraded(card, lookupCompany, opts.grade);
  // if (pc != null) return { ...base, amount: pc, source: "pricecharting", note };

  // 3) estimate from raw x grade-multiplier (clearly labeled)
  const raw = rawMarket(variant);
  const mult = GRADE_MULTIPLIER[Number(opts.grade)];
  if (raw != null && mult != null) {
    return {
      ...base,
      amount: raw * mult,
      source: "estimate",
      note: note ? `${note} Estimated from raw.` : "Estimated from raw price.",
    };
  }

  return { ...base, amount: null, source: "none", note };
}

export { GRADE_MULTIPLIER };
