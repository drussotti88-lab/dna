import { value } from "@/lib/pricing";
import { buildCard } from "@/lib/cardstore";

// ============================================================================
// lib/collection.js — value a user's items by reading the price STORE (the one
// read path) and running the single pricing service. No live calls here; the
// store is kept fresh by ingest-on-entry + the daily refresh cron.
// ============================================================================

// Given a Supabase client (catalog is public-read) and items, return enriched
// items with current market value + totals.
export async function valueItems(supabase, items) {
  if (!items?.length) {
    return { items: [], totals: { count: 0, value: 0, cost: 0, pl: 0 } };
  }
  const cardIds = Array.from(new Set(items.map((i) => i.card_id)));

  const [{ data: cards }, { data: variants }, { data: prices }] = await Promise.all([
    supabase.from("cards").select("*").in("id", cardIds),
    supabase.from("card_variants").select("*").in("card_id", cardIds),
    supabase.from("card_prices").select("*").in("card_id", cardIds),
  ]);

  const cardById = {};
  for (const c of cards || []) {
    cardById[c.id] = buildCard(
      c,
      (variants || []).filter((v) => v.card_id === c.id),
      (prices || []).filter((p) => p.card_id === c.id)
    );
  }

  let totalValue = 0;
  let totalCost = 0;
  let totalCount = 0;

  const enriched = items.map((it) => {
    const card = cardById[it.card_id] || null;
    const v = card
      ? value(card, {
          variant: it.variant_key,
          graded: it.type === "graded",
          company: it.company,
          grade: it.grade,
        })
      : { amount: null, source: "none" };
    const unit = v.amount ?? 0;
    const qty = it.quantity || 1;
    const lineValue = unit * qty;
    const lineCost = (it.cost_usd ?? 0) * qty;
    totalValue += lineValue;
    totalCost += it.cost_usd != null ? lineCost : 0;
    totalCount += qty;
    return {
      ...it,
      card: card
        ? { id: card.id, name: card.name, images: card.images, setName: card.setName, number: card.number, game: card.game }
        : null,
      marketValue: unit,
      lineValue,
      source: v.source,
    };
  });

  return {
    items: enriched,
    totals: {
      count: totalCount,
      value: totalValue,
      cost: totalCost,
      pl: totalValue - totalCost,
    },
  };
}
