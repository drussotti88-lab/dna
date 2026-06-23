"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { APP_VERSION } from "@/lib/version";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("signin"); // signin | signup | magic
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const configured =
    typeof window !== "undefined" &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const supabase = supabaseBrowser();
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        setMsg("Check your email for a sign-in link.");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        setMsg("Account created. Check your email to confirm, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/collection");
        router.refresh();
      }
    } catch (e2) {
      setErr(String(e2.message || e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap" style={{ maxWidth: 420, paddingTop: 72 }}>
      <h1 className="display" style={{ fontSize: 30 }}>
        DNA <span style={{ color: "var(--br)" }}>Vault</span>
      </h1>
      <p style={{ color: "var(--t2)", marginTop: 6, marginBottom: 22 }}>
        Sign in to track and value your collection.
      </p>

      {!configured && (
        <div className="card" style={{ padding: 14, color: "var(--wn)", marginBottom: 16 }}>
          <i className="ti ti-alert-triangle" /> Supabase isn&apos;t configured in this environment
          yet. Auth will work once the Supabase env vars are set.
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <button className={`chip${mode === "signin" ? " on" : ""}`} onClick={() => setMode("signin")}>
          Sign in
        </button>
        <button className={`chip${mode === "signup" ? " on" : ""}`} onClick={() => setMode("signup")}>
          Create account
        </button>
        <button className={`chip${mode === "magic" ? " on" : ""}`} onClick={() => setMode("magic")}>
          Email link
        </button>
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          className="fi"
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {mode !== "magic" && (
          <input
            className="fi"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        )}
        <button className="btn" disabled={busy} type="submit">
          {busy ? "…" : mode === "signup" ? "Create account" : mode === "magic" ? "Send link" : "Sign in"}
        </button>
      </form>

      {msg && <p style={{ color: "var(--ok)", marginTop: 12 }}>{msg}</p>}
      {err && <p style={{ color: "var(--no)", marginTop: 12 }}>{err}</p>}

      <footer className="mono" style={{ color: "var(--t3)", fontSize: 11, marginTop: 40 }}>
        v{APP_VERSION}
      </footer>
    </main>
  );
}
