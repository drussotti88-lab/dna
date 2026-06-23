import { supabaseServer } from "@/lib/supabase/server";
import { ensureDefaultPortfolio } from "@/lib/portfolio";
import { resolveRow } from "@/lib/resolve";
import { ingestCard } from "@/lib/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CONFIDENCE_OK = 0.75; // below this -> needs_review
const MAX_ROWS = 40; // plan-safe per request; client chunks larger imports

// POST /api/import { rows: NormalizedRow[], portfolio_id? }
export async function POST(request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json();
  const rows = (body.rows || []).slice(0, MAX_ROWS);
  const portfolio_id = body.portfolio_id || (await ensureDefaultPortfolio(supabase, user.id))?.id;

  const results = [];
  for (const row of rows) {
    const res = await resolveRow(row);
    const needs_review = !res.card_id || res.confidence < CONFIDENCE_OK;

    if (!res.card_id) {
      results.push({ name: row.name, status: "unresolved" });
      continue;
    }

    // ingest the resolved card into the store (no comps on bulk import = lighter)
    try {
      await ingestCard(res.card_id, { game: res.game, withComps: false });
    } catch {
      /* keep going; value fills on next refresh */
    }

    const { error } = await supabase.from("items").insert({
      user_id: user.id,
      portfolio_id,
      card_id: res.card_id,
      variant_key: row.type === "graded" ? row.variant_key || res.variant_key : res.variant_key,
      type: row.type || "raw",
      condition: row.condition || null,
      company: row.company || null,
      grade: row.grade ?? null,
      cert: row.cert || null,
      quantity: row.quantity || 1,
      cost_usd: row.cost_usd ?? null,
      acquired_at: row.acquired_at || null,
      needs_review,
    });

    results.push({
      name: row.name,
      matched: res.candidate?.name,
      confidence: Math.round(res.confidence * 100),
      status: error ? "error" : needs_review ? "review" : "added",
      error: error?.message,
    });
  }

  const summary = {
    added: results.filter((r) => r.status === "added").length,
    review: results.filter((r) => r.status === "review").length,
    unresolved: results.filter((r) => r.status === "unresolved").length,
    errors: results.filter((r) => r.status === "error").length,
    processed: results.length,
  };
  return Response.json({ summary, results });
}
