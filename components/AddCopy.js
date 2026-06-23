"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Add an owned copy of the currently-selected printing/grade to a portfolio.
// Posts to /api/items, which ingests the card into the store, then inserts.
export default function AddCopy({ card, variantKey, graded, company, grade }) {
  const [open, setOpen] = useState(false);
  const [portfolios, setPortfolios] = useState([]);
  const [portfolioId, setPortfolioId] = useState("");
  const [qty, setQty] = useState(1);
  const [cost, setCost] = useState("");
  const [acquired, setAcquired] = useState("");
  const [state, setState] = useState("idle"); // idle | saving | done | error | auth
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/portfolios")
      .then((r) => (r.status === 401 ? { portfolios: [] } : r.json()))
      .then((d) => {
        setPortfolios(d.portfolios || []);
        if (d.portfolios?.[0]) setPortfolioId(d.portfolios[0].id);
      })
      .catch(() => {});
  }, [open]);

  async function save() {
    setState("saving");
    setErr(null);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: card.id,
          game: card.game || "pokemon",
          variant_key: variantKey,
          type: graded ? "graded" : "raw",
          company: graded ? company : null,
          grade: graded ? grade : null,
          quantity: Number(qty) || 1,
          cost_usd: cost === "" ? null : Number(cost),
          acquired_at: acquired || null,
          portfolio_id: portfolioId || null,
        }),
      });
      if (res.status === 401) {
        setState("auth");
        return;
      }
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setState("done");
      setTimeout(() => {
        setOpen(false);
        setState("idle");
      }, 1200);
    } catch (e) {
      setErr(String(e.message || e));
      setState("error");
    }
  }

  if (!open) {
    return (
      <button className="btn" style={{ marginTop: 12 }} onClick={() => setOpen(true)}>
        <i className="ti ti-plus" /> Add with detail
      </button>
    );
  }

  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10, maxWidth: 420 }}>
      <div className="xs" style={{ color: "var(--t2)" }}>
        Adding: <strong>{card.name}</strong> · {variantKey} ·{" "}
        {graded ? `${company} ${grade}` : "Raw"}
      </div>

      {state === "auth" ? (
        <div className="card" style={{ padding: 12 }}>
          <p className="xs" style={{ marginBottom: 8 }}>
            Sign in to save copies to your collection.
          </p>
          <Link href="/login" className="btn">
            <i className="ti ti-login" /> Sign in
          </Link>
        </div>
      ) : (
        <>
          {portfolios.length > 0 && (
            <select className="pfs" value={portfolioId} onChange={(e) => setPortfolioId(e.target.value)}>
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="fi"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Qty"
              style={{ width: 80 }}
            />
            <input
              className="fi"
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="Cost (USD)"
              style={{ width: 140 }}
            />
            <input
              className="fi"
              type="date"
              value={acquired}
              onChange={(e) => setAcquired(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={save} disabled={state === "saving"}>
              {state === "saving" ? "Saving…" : state === "done" ? "Added ✓" : "Save copy"}
            </button>
            <button className="tool" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
          {err && <p className="xs" style={{ color: "var(--no)" }}>{err}</p>}
        </>
      )}
    </div>
  );
}
