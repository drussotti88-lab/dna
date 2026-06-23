import { getCard, getListings } from "@/lib/scrydex";
import { supabaseAdmin } from "@/lib/supabase/server";

// ============================================================================
// lib/ingest.js — when a card enters any user's world, ingest it into the
// catalog/price store. This is what makes "ONE read path" real: the app reads
// the store; this keeps it fresh. Uses service-role (bypasses RLS) for catalog.
// Prices arrive already USD-normalized from lib/scrydex (JPY converted at source).
// ============================================================================

// Upsert a card (+ its set, variants, prices) from Scrydex into the store.
// Returns the normalized card. Safe to call repeatedly (idempotent upserts).
export async function ingestCard(id, { game = "pokemon", lang, withComps = false } = {}) {
  const resolvedLang = lang || (id.includes("_ja") ? "ja" : "en");
  const card = await getCard(id, { game, lang: resolvedLang });
  if (!card) return null;

  const db = supabaseAdmin();

  // set
  if (card.expansion?.id) {
    await db.from("sets").upsert(
      {
        id: card.expansion.id,
        game,
        lang: resolvedLang,
        name: card.expansion.name || card.setName || card.expansion.id,
        series: card.expansion.series || null,
        printed_total: card.expansion.printed_total ?? card.expansion.total ?? null,
        images: card.expansion.images || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  }

  // card
  await db.from("cards").upsert(
    {
      id: card.id,
      game,
      lang: resolvedLang,
      name: card.name,
      number: card.number,
      set_id: card.setId,
      rarity: card.rarity,
      artist: card.artist,
      images: card.images, // canonical url we serve (self-host job can swap later)
      expansion: card.expansion,
      raw: card.raw,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  // variants + prices
  for (const v of card.variants || []) {
    await db.from("card_variants").upsert(
      {
        card_id: card.id,
        variant_key: v.key,
        label: v.label,
        is_special_format: /jumbo|oversize|metal|box ?topper|topper|poster|sticker/i.test(
          `${v.label} ${v.key}`
        ),
      },
      { onConflict: "card_id,variant_key" }
    );

    for (const p of v.prices || []) {
      await db.from("card_prices").upsert(
        {
          card_id: card.id,
          variant_key: v.key,
          type: p.type,
          condition: p.condition,
          company: p.company,
          grade: p.grade,
          low: p.low,
          mid: p.mid,
          high: p.high,
          market: p.market,
          source: "scrydex",
          currency: "USD",
          trends: p.trends,
          as_of: new Date().toISOString(),
        },
        { onConflict: "card_id,variant_key,type,company,grade" }
      );
    }
  }

  // optional sold comps (real deep history + velocity)
  if (withComps) {
    const comps = await getListings(id, { game, lang: resolvedLang }).catch(() => []);
    for (const c of comps) {
      if (c.priceUsd == null || !c.soldAt) continue;
      await db.from("sold_comps").upsert(
        {
          card_id: card.id,
          company: c.company,
          grade: c.grade,
          price_usd: c.priceUsd,
          sold_at: c.soldAt,
          source: "scrydex",
          external_id: c.externalId || `${card.id}-${c.soldAt}-${c.priceUsd}`,
        },
        { onConflict: "card_id,external_id" }
      );
    }
  }

  return card;
}
