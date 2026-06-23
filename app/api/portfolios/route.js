import { supabaseServer } from "@/lib/supabase/server";
import { ensureDefaultPortfolio } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

async function getUserAndDb() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// GET /api/portfolios — list (auto-creates default)
export async function GET() {
  const { supabase, user } = await getUserAndDb();
  if (!user) return Response.json({ portfolios: [] }, { status: 401 });
  await ensureDefaultPortfolio(supabase, user.id);
  const { data } = await supabase
    .from("portfolios")
    .select("*")
    .order("created_at", { ascending: true });
  return Response.json({ portfolios: data || [] });
}

// POST /api/portfolios { name }
export async function POST(request) {
  const { supabase, user } = await getUserAndDb();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  const body = await request.json();
  const name = (body.name || "").trim();
  if (!name) return Response.json({ error: "Name required" }, { status: 400 });
  const { data, error } = await supabase
    .from("portfolios")
    .insert({ user_id: user.id, name })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ portfolio: data });
}
