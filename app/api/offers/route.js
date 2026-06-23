import { supabaseServer } from "@/lib/supabase/server";
import { ensureDefaultPortfolio } from "@/lib/portfolio";
import { awardCoins } from "@/lib/profile";

export const dynamic = "force-dynamic";

// POST -> make an offer on a listing
export async function POST(request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const b = await request.json();
  if (!b.listing_id || b.amount_usd == null)
    return Response.json({ error: "listing_id and amount_usd required" }, { status: 400 });

  const { data, error } = await supabase
    .from("offers")
    .insert({
      listing_id: b.listing_id,
      buyer_id: user.id,
      amount_usd: Number(b.amount_usd),
      message: b.message || null,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ offer: data });
}

// PATCH { id, status } -> withdraw (buyer) / accept|decline (seller).
// On accept: post-deal sync — listing sold, item moves to buyer's collection.
export async function PATCH(request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const b = await request.json();
  const { data: offer } = await supabase.from("offers").select("*").eq("id", b.id).single();
  if (!offer) return Response.json({ error: "Offer not found" }, { status: 404 });
  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", offer.listing_id)
    .single();

  const isSeller = listing && listing.seller_id === user.id;
  const isBuyer = offer.buyer_id === user.id;

  if (b.status === "withdrawn" && !isBuyer)
    return Response.json({ error: "Not your offer" }, { status: 403 });
  if ((b.status === "accepted" || b.status === "declined") && !isSeller)
    return Response.json({ error: "Only the seller can do that" }, { status: 403 });

  await supabase.from("offers").update({ status: b.status }).eq("id", b.id);

  if (b.status === "accepted" && isSeller) {
    // mark listing sold
    await supabase.from("listings").update({ status: "sold" }).eq("id", listing.id);
    // decline other pending offers on this listing
    await supabase
      .from("offers")
      .update({ status: "declined" })
      .eq("listing_id", listing.id)
      .eq("status", "pending");

    // post-deal collection sync: add the card to the buyer's default portfolio.
    // (Buyer client; allowed by RLS since buyer acts as themselves is not the
    // case here — seller is acting. So use the buyer's row via service role.)
    try {
      const { supabaseAdmin } = await import("@/lib/supabase/server");
      const admin = supabaseAdmin();
      const { data: pf } = await admin
        .from("portfolios")
        .select("*")
        .eq("user_id", offer.buyer_id)
        .order("created_at", { ascending: true })
        .limit(1);
      let portfolio_id = pf?.[0]?.id;
      if (!portfolio_id) {
        const { data: created } = await admin
          .from("portfolios")
          .insert({ user_id: offer.buyer_id, name: "My Collection", is_default: true })
          .select()
          .single();
        portfolio_id = created?.id;
      }
      await admin.from("items").insert({
        user_id: offer.buyer_id,
        portfolio_id,
        card_id: listing.card_id,
        variant_key: listing.variant_key,
        type: listing.type,
        company: listing.company,
        grade: listing.grade,
        quantity: 1,
        cost_usd: offer.amount_usd,
        acquired_at: new Date().toISOString().slice(0, 10),
        notes: "Acquired via DNA Vault marketplace",
      });
      // seller's item, if linked, is removed
      if (listing.item_id) {
        await admin.from("items").delete().eq("id", listing.item_id);
      }
      // small coin reward for a completed deal
      await awardCoins(admin, listing.seller_id, 50);
      await awardCoins(admin, offer.buyer_id, 25);
    } catch (e) {
      // deal recorded even if sync hiccups; surfaced as needs-review elsewhere
    }
  }

  return Response.json({ ok: true });
}
