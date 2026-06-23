import { searchCards } from "@/lib/scrydex";
import { gameToScrydex } from "@/lib/csv";

// ============================================================================
// lib/resolve.js — the ONE-TIME CSV->Scrydex resolve. A CSV has no canonical id,
// so we search and pick the best Scrydex match, with a confidence score. Low
// confidence is flagged needs_review (never silently mis-matched). This is the
// only cross-source matching that exists anywhere in the app.
// ============================================================================

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function nameScore(a, b) {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (y.includes(x) || x.includes(y)) return 0.8;
  const xw = new Set(x.split(" "));
  const yw = y.split(" ");
  const hit = yw.filter((w) => xw.has(w)).length;
  return hit / Math.max(xw.size, yw.length);
}

// Resolve one normalized CSV row -> { card_id, game, variant_key, confidence, candidate }
export async function resolveRow(row) {
  const game = gameToScrydex(row.game);
  const query = [row.name, row.number].filter(Boolean).join(" ");
  let candidates = [];
  try {
    candidates = await searchCards(query, { game, lang: "en", pageSize: 40 });
  } catch {
    candidates = [];
  }
  if (!candidates.length) {
    return { card_id: null, game, confidence: 0, candidate: null };
  }

  let best = null;
  let bestScore = -1;
  for (const c of candidates) {
    let score = nameScore(row.name, c.name) * 0.7;
    if (row.number && c.number && String(row.number) === String(c.number)) score += 0.2;
    if (row.set && c.setName && norm(c.setName).includes(norm(row.set))) score += 0.1;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  // pick a default variant (first)
  const variant_key = best?.variants?.[0]?.key || "normal";
  return {
    card_id: best?.id || null,
    game,
    variant_key,
    confidence: Math.min(1, Math.max(0, bestScore)),
    candidate: best ? { id: best.id, name: best.name, number: best.number, setName: best.setName } : null,
  };
}
