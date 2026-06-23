import { supabaseServer } from "@/lib/supabase/server";

// Current signed-in user (server-side), or null. Use in Server Components/routes.
export async function currentUser() {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user || null;
  } catch {
    return null;
  }
}

export function authConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
