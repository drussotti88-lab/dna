"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fmtNum } from "@/lib/format";

export default function SettingsPage() {
  const [profile, setProfile] = useState(null);
  const [needAuth, setNeedAuth] = useState(false);
  const [saved, setSaved] = useState(false);
  const [patreonMsg, setPatreonMsg] = useState(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("patreon");
    if (p) setPatreonMsg(p);
    fetch("/api/profile")
      .then((r) => (r.status === 401 ? Promise.reject("auth") : r.json()))
      .then((d) => setProfile(d.profile))
      .catch(() => setNeedAuth(true));
  }, []);

  async function save() {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle: profile.handle,
        display_name: profile.display_name,
        bio: profile.bio,
        is_public: profile.is_public,
      }),
    });
    const d = await res.json();
    if (d.profile) {
      setProfile(d.profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  }

  if (needAuth) {
    return (
      <div className="wrap" style={{ maxWidth: 520 }}>
        <h1 className="display" style={{ fontSize: 24, marginBottom: 8 }}>Settings</h1>
        <Link href="/login" className="btn"><i className="ti ti-login" /> Sign in</Link>
      </div>
    );
  }
  if (!profile) return <div className="wrap"><p style={{ color: "var(--t3)" }}>Loading…</p></div>;

  const supporterActive =
    profile.supporter && (!profile.supporter_until || new Date(profile.supporter_until) > new Date());

  return (
    <div className="wrap" style={{ maxWidth: 560 }}>
      <h1 className="display" style={{ fontSize: 24, marginBottom: 16 }}>Settings</h1>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, marginBottom: 12 }}>Public profile</h3>
        <label className="xs">Handle</label>
        <input className="fi" style={{ width: "100%", marginBottom: 10 }} value={profile.handle || ""}
          onChange={(e) => setProfile({ ...profile, handle: e.target.value })} />
        <label className="xs">Display name</label>
        <input className="fi" style={{ width: "100%", marginBottom: 10 }} value={profile.display_name || ""}
          onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} />
        <label className="xs">Bio</label>
        <textarea className="fi" style={{ width: "100%", height: 70, padding: 10, marginBottom: 10 }}
          value={profile.bio || ""} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <input type="checkbox" checked={!!profile.is_public}
            onChange={(e) => setProfile({ ...profile, is_public: e.target.checked })} />
          <span className="xs">Make my profile &amp; public portfolios visible</span>
        </label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn" onClick={save}>{saved ? "Saved ✓" : "Save"}</button>
          {profile.handle && (
            <Link href={`/u/${profile.handle}`} className="tool"><i className="ti ti-external-link" /> View public</Link>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>
          Supporter {supporterActive && <span className="pill" style={{ color: "var(--gold)" }}>Pro ✦</span>}
        </h3>
        <p className="xs" style={{ marginBottom: 12 }}>
          Pro unlocks the scanner, deeper intelligence, and advanced tools. Linked via Patreon.
        </p>
        {patreonMsg && (
          <p className="xs" style={{ color: patreonMsg === "active" ? "var(--ok)" : "var(--wn)", marginBottom: 10 }}>
            {patreonMsg === "active" && "Patreon linked — Pro is active. Thank you!"}
            {patreonMsg === "connected" && "Patreon linked, but no active pledge was found."}
            {patreonMsg === "unconfigured" && "Patreon isn't configured in this environment yet."}
            {patreonMsg === "error" && "Couldn't complete the Patreon link. Try again."}
          </p>
        )}
        {!supporterActive && (
          <a className="btn" href="/api/patreon/connect"><i className="ti ti-brand-patreon" /> Connect Patreon</a>
        )}
      </div>

      <div className="card" style={{ padding: 18 }}>
        <h3 style={{ fontSize: 14, marginBottom: 6 }}>Vault Coins</h3>
        <div className="mono" style={{ fontSize: 26, color: "var(--gold)" }}>
          <i className="ti ti-coin" /> {fmtNum(profile.vault_coins || 0)}
        </div>
        <p className="xs" style={{ marginTop: 6 }}>
          Earn coins from completed deals and achievements. Spend them on raffles and perks (coming soon).
        </p>
      </div>
    </div>
  );
}
