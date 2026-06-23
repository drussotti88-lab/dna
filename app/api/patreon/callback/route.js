import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

// Exchanges the Patreon code, checks for an active pledge, flips the supporter
// flag on the user's profile.
export async function GET(request) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);
  await ensureProfile(supabase, user);

  const clientId = process.env.PATREON_CLIENT_ID;
  const clientSecret = process.env.PATREON_CLIENT_SECRET;
  const redirect = process.env.PATREON_REDIRECT_URI || `${origin}/api/patreon/callback`;
  if (!code || !clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/settings?patreon=error`);
  }

  try {
    const tokenRes = await fetch("https://www.patreon.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirect,
      }),
    });
    const token = await tokenRes.json();
    if (!token.access_token) throw new Error("no token");

    const meRes = await fetch(
      "https://www.patreon.com/api/oauth2/v2/identity?include=memberships&fields%5Bmember%5D=patron_status",
      { headers: { Authorization: `Bearer ${token.access_token}` } }
    );
    const me = await meRes.json();
    const patreonId = me?.data?.id || null;
    const members = me?.included || [];
    const active = members.some((m) => m?.attributes?.patron_status === "active_patron");

    const until = new Date();
    until.setDate(until.getDate() + 35);

    await supabase
      .from("profiles")
      .update({
        supporter: active,
        supporter_until: active ? until.toISOString() : null,
        patreon_id: patreonId,
      })
      .eq("id", user.id);

    return NextResponse.redirect(`${origin}/settings?patreon=${active ? "active" : "connected"}`);
  } catch {
    return NextResponse.redirect(`${origin}/settings?patreon=error`);
  }
}
