"use client";

import { useEffect, useState } from "react";

// Optional AI market brief. Fetches a short summary of the day's movers; if the
// AI key isn't configured, it falls back to a rule-based pulse line.
export default function MarketBrief({ movers }) {
  const [brief, setBrief] = useState(null);
  const [ai, setAi] = useState(false);

  // rule-based fallback (always available)
  const fallback = (() => {
    if (!movers?.length) return "Not enough data yet for a market read.";
    const up = movers.filter((m) => (m.d30 ?? 0) > 0).length;
    const down = movers.filter((m) => (m.d30 ?? 0) < 0).length;
    const top = [...movers].sort((a, b) => (b.d30 ?? 0) - (a.d30 ?? 0))[0];
    return `Of the tracked movers, ${up} are up and ${down} are down over 30 days${
      top ? `; ${top.name} leads at ${top.d30 > 0 ? "+" : ""}${top.d30?.toFixed(1)}%` : ""
    }.`;
  })();

  useEffect(() => {
    if (!movers?.length) return;
    fetch("/api/intel/brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movers }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.brief) {
          setBrief(d.brief);
          setAi(true);
        }
      })
      .catch(() => {});
  }, [movers]);

  return (
    <div
      className="card"
      style={{ padding: 16, background: "color-mix(in srgb, var(--br) 10%, var(--sf))" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <i className="ti ti-sparkles" style={{ color: "var(--br)" }} />
        <h3 style={{ fontSize: 14 }}>Market pulse</h3>
        {ai && <span className="pill">AI</span>}
      </div>
      <p style={{ color: "var(--t2)", margin: 0, fontSize: 13.5 }}>{brief || fallback}</p>
    </div>
  );
}
