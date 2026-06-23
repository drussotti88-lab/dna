// Ensure the user has at least a default portfolio; return it.
export async function ensureDefaultPortfolio(supabase, userId) {
  const { data: existing } = await supabase
    .from("portfolios")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (existing && existing.length) {
    return existing.find((p) => p.is_default) || existing[0];
  }
  const { data: created } = await supabase
    .from("portfolios")
    .insert({ user_id: userId, name: "My Collection", is_default: true })
    .select()
    .single();
  return created;
}
