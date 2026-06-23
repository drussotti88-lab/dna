// ============================================================================
// lib/cardstore.js — read normalized Card shapes from the price STORE (the one
// read path). Shared by collection valuation and the intelligence surfaces, so
// everyone reconstructs cards from the store identically.
// ============================================================================

export function buildCard(cardRow, variantRows, priceRows) {
  const variants = (variantRows || []).map((v) => ({
    key: v.variant_key,
    label: v.label,
    prices: (priceRows || [])
      .filter((p) => p.variant_key === v.variant_key)
      .map((p) => ({
        type: p.type,
        condition: p.condition,
        company: p.company,
        grade: p.grade,
        low: p.low,
        mid: p.mid,
        high: p.high,
        market: p.market,
        currency: "USD",
        trends: p.trends,
      })),
  }));
  return {
    id: cardRow.id,
    game: cardRow.game,
    name: cardRow.name,
    number: cardRow.number,
    setId: cardRow.set_id,
    setName: cardRow.expansion?.name || null,
    rarity: cardRow.rarity,
    images: cardRow.images || {},
    variants,
  };
}

// Fetch up to `limit` cards from the store as normalized Card shapes.
export async function fetchStoreCards(supabase, { limit = 200 } = {}) {
  const { data: cards } = await supabase
    .from("cards")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (!cards?.length) return [];
  const ids = cards.map((c) => c.id);
  const [{ data: variants }, { data: prices }] = await Promise.all([
    supabase.from("card_variants").select("*").in("card_id", ids),
    supabase.from("card_prices").select("*").in("card_id", ids),
  ]);
  return cards.map((c) =>
    buildCard(
      c,
      (variants || []).filter((v) => v.card_id === c.id),
      (prices || []).filter((p) => p.card_id === c.id)
    )
  );
}
