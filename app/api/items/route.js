import { supabaseServer } from "@/lib/supabase/server";
import { ingestCard } from "@/lib/ingest";
import { ensureDefaultPortfolio } from "@/lib/portfolio";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function getUser() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// GET /api/items?portfolio=ID  — the user's items (RLS-scoped)
export async function GET(request) {
  const { supabase, user } = await getUser();
  if (!user) return Response.json({ items: [] }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const portfolio = searchParams.get("portfolio");

  let q = supabase.from("items").select("*").order("created_at", { ascending: false });
  if (portfolio) q = q.eq("portfolio_id", portfolio);
  const { data, error } = await q;
  if (error) return Response.json({ items: [], error: error.message }, { status: 400 });
  return Response.json({ items: data || [] });
}

// POST /api/items — add an owned copy. Ingests the card into the store first.
// body: { card_id, game, variant_key, type, condition, company, grade, cert,
//         quantity, cost_usd, acquired_at, portfolio_id }
export async function POST(request) {
  const { supabase, user } = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const b = await request.json();
  if (!b.card_id) return Response.json({ error: "card_id required" }, { status: 400 });

  // Ingest-on-entry: card + variants + prices land in the store (one read path).
  try {
    await ingestCard(b.card_id, { game: b.game || "pokemon", withComps: true });
  } catch (e) {
    // Don't block adding a copy if ingest hiccups; mark for review instead.
    b.needs_review = true;
  }

  const portfolio_id = b.portfolio_id || (await ensureDefaultPortfolio(supabase, user.id))?.id;

  const row = {
    user_id: user.id,
    portfolio_id,
    card_id: b.card_id,
    variant_key: b.variant_key || "normal",
    type: b.type || "raw",
    condition: b.condition || null,
    company: b.company || null,
    grade: b.grade ?? null,
    cert: b.cert || null,
    quantity: b.quantity || 1,
    cost_usd: b.cost_usd ?? null,
    acquired_at: b.acquired_at || null,
    needs_review: !!b.needs_review,
    notes: b.notes || null,
  };

  const { data, error } = await supabase.from("items").insert(row).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ item: data });
}

// PATCH /api/items { id, ...fields }
export async function PATCH(request) {
  const { supabase, user } = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  const b = await request.json();
  if (!b.id) return Response.json({ error: "id required" }, { status: 400 });
  const { id, ...fields } = b;
  delete fields.user_id;
  const { data, error } = await supabase
    .from("items")
    .update(fields)
    .eq("id", id)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ item: data });
}

// DELETE /api/items?id=ID
export async function DELETE(request) {
  const { supabase, user } = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
