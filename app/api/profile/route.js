import { supabaseServer } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ profile: null }, { status: 401 });
  const profile = await ensureProfile(supabase, user);
  return Response.json({ profile });
}

// PATCH { handle, display_name, bio, is_public, avatar_url }
export async function PATCH(request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  await ensureProfile(supabase, user);

  const b = await request.json();
  const fields = {};
  for (const k of ["handle", "display_name", "bio", "is_public", "avatar_url"]) {
    if (k in b) fields[k] = b[k];
  }
  if (fields.handle) fields.handle = String(fields.handle).replace(/[^a-z0-9_-]/gi, "").toLowerCase();

  const { data, error } = await supabase
    .from("profiles")
    .update(fields)
    .eq("id", user.id)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ profile: data });
}
