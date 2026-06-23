import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Exchanges the email-link / OAuth code for a session, then lands in Collection.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/collection";

  if (code) {
    const supabase = await supabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
