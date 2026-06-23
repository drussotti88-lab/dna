import { supabaseServer } from "@/lib/supabase/server";
import { valueItems } from "@/lib/collection";
import MarketView from "@/components/MarketView";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // active listings + card display info
  const { data: listings } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(60);

  const cardIds = Array.from(new Set((listings || []).map((l) => l.card_id)));
  const { data: cards } = cardIds.length
    ? await supabase.from("cards").select("id,name,images,expansion,number,game").in("id", cardIds)
    : { data: [] };
  const cardById = Object.fromEntries((cards || []).map((c) => [c.id, c]));

  const enrichedListings = (listings || []).map((l) => ({
    ...l,
    card: cardById[l.card_id] || null,
  }));

  // the user's sellable items (to create listings from)
  let sellable = [];
  if (user) {
    const { data: rawItems } = await supabase.from("items").select("*").limit(200);
    const { items } = await valueItems(supabase, rawItems || []);
    sellable = items;
  }

  return (
    <MarketView listings={enrichedListings} sellable={sellable} signedIn={!!user} myId={user?.id || null} />
  );
}
