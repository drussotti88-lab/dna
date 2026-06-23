import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/listings           -> active listings (public)
// GET /api/listings?mine=1     -> the signed-in user's listings
export async function GET(request) {
  const supabase = await supabaseServer();
  const { searchParams } = new URL(request.url);
  const mine = searchParams.get("mine") === "1";

  let q = supabase.from("listings").select("*").order("created_at", { ascending: false });
  if (mine) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Response.json({ listings: [] }, { status: 401 });
    q = q.eq("seller_id", user.id);
  } else {
    q = q.eq("status", "active");
  }
  const { data, error } = await q;
  if (error) return Response.json({ listings: [], error: error.message }, { status: 400 });
  return Response.json({ listings: data || [] });
}

// POST -> create a listing (optionally from an owned item)
export async function POST(request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const b = await request.json();
  if (!b.card_id || b.price_usd == null)
    return Response.json({ error: "card_id and price_usd required" }, { status: 400 });

  const { data, error } = await supabase
    .from("listings")
    .insert({
      seller_id: user.id,
      item_id: b.item_id || null,
      card_id: b.card_id,
      variant_key: b.variant_key || "normal",
      type: b.type || "raw",
      company: b.company || null,
      grade: b.grade ?? null,
      price_usd: Number(b.price_usd),
      note: b.note || null,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ listing: data });
}

// DELETE /api/listings?id=ID -> cancel
export async function DELETE(request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const { error } = await supabase
    .from("listings")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("seller_id", user.id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
