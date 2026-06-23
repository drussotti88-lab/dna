// Profile helpers: ensure a profile exists, supporter status, coin awards.

function handleFromEmail(email, id) {
  const base = (email || "collector").split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase();
  return `${base || "vault"}-${id.slice(0, 4)}`;
}

export async function ensureProfile(supabase, user) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) return existing;
  const { data: created } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      handle: handleFromEmail(user.email, user.id),
      display_name: (user.email || "").split("@")[0],
    })
    .select()
    .single();
  return created;
}

export function isSupporter(profile) {
  if (!profile?.supporter) return false;
  if (profile.supporter_until && new Date(profile.supporter_until) < new Date()) return false;
  return true;
}

// Award Vault Coins (server, service-role or own row).
export async function awardCoins(supabase, userId, amount) {
  const { data: p } = await supabase.from("profiles").select("vault_coins").eq("id", userId).single();
  const next = (p?.vault_coins || 0) + amount;
  await supabase.from("profiles").update({ vault_coins: next }).eq("id", userId);
  return next;
}
