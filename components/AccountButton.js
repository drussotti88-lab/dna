"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AccountButton() {
  const router = useRouter();
  const [email, setEmail] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setReady(true);
      return;
    }
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setEmail(data?.user?.email || null);
        setReady(true);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email || null);
    });
    return () => {
      active = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  async function signOut() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.push("/browse");
    router.refresh();
  }

  if (!ready) return null;

  if (!email) {
    return (
      <Link href="/login" className="acct" data-tip="Sign in">
        <i className="ti ti-login" />
        <span className="acct-label">Sign in</span>
      </Link>
    );
  }

  return (
    <button className="acct" onClick={signOut} data-tip="Sign out" title={email}>
      <i className="ti ti-user-circle" />
      <span className="acct-label">Sign out</span>
    </button>
  );
}
