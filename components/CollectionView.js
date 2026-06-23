"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CardImage from "@/components/CardImage";
import { fmtUSD, fmtNum } from "@/lib/format";

export default function CollectionView({ items, totals, portfolios }) {
  const router = useRouter();
  const [portfolio, setPortfolio] = useState("all");
  const [needsReview, setNeedsReview] = useState(false);
  const [sort, setSort] = useState("recent");

  const shown = useMemo(() => {
    let list = items;
    if (portfolio !== "all") list = list.filter((i) => i.portfolio_id === portfolio);
    if (needsReview) list = list.filter((i) => i.needs_review);
    if (sort === "value") list = [...list].sort((a, b) => b.lineValue - a.lineValue);
    else if (sort === "name")
      list = [...list].sort((a, b) => (a.card?.name || "").localeCompare(b.card?.name || ""));
    return list;
  }, [items, portfolio, needsReview, sort]);

  const view = useMemo(() => {
    let value = 0,
      cost = 0,
      count = 0;
    for (const i of shown) {
      value += i.lineValue || 0;
      cost += i.cost_usd != null ? i.cost_usd * (i.quantity || 1) : 0;
      count += i.quantity || 1;
    }
    return { value, cost, count, pl: value - cost };
  }, [shown]);

  async function remove(id) {
    if (!confirm("Remove this copy from your collection?")) return;
    await fetch(`/api/items?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="wrap">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <h1 className="display" style={{ fontSize: 24 }}>
          Collection
        </h1>
        <Link href="/import" className="tool" style={{ marginLeft: "auto" }}>
          <i className="ti ti-file-import" /> Import CSV
        </Link>
        <Link href="/scan" className="tool">
          <i className="ti ti-camera" /> Scan
        </Link>
      </div>

      {/* value summary */}
      <div className="cl-summary">
        <Stat label="Total value" value={fmtUSD(view.value)} />
        <Stat label="Cost basis" value={fmtUSD(view.cost)} />
        <Stat
          label="Profit / loss"
          value={`${view.pl >= 0 ? "+" : ""}${fmtUSD(view.pl)}`}
          tone={view.pl >= 0 ? "up" : "down"}
        />
        <Stat label="Copies" value={fmtNum(view.count)} />
      </div>

      {/* filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "16px 0" }}>
        <select className="pfs" value={portfolio} onChange={(e) => setPortfolio(e.target.value)}>
          <option value="all">All portfolios</option>
          {portfolios.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select className="pfs" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">Recently added</option>
          <option value="value">Value</option>
          <option value="name">Name</option>
        </select>
        <button
          className={`chip${needsReview ? " on" : ""}`}
          onClick={() => setNeedsReview((v) => !v)}
        >
          <i className="ti ti-flag" /> Needs review
        </button>
      </div>

      {shown.length === 0 ? (
        <p style={{ color: "var(--t3)" }}>
          No copies yet. Find a card in <Link href="/browse" style={{ color: "var(--br)" }}>Browse</Link>{" "}
          and add it, or import a CSV.
        </p>
      ) : (
        <div className="grid">
          {shown.map((i) => (
            <div key={i.id} className={`xc${i.needs_review ? "" : ""}`}>
              <Link href={`/card/${encodeURIComponent(i.card_id)}?game=${i.card?.game || "pokemon"}`}>
                <div className="xi">
                  <CardImage src={i.card?.images?.small} alt={i.card?.name} />
                  {i.needs_review && (
                    <span className="owned-check" style={{ background: "var(--wn)", color: "#1a1206" }}>
                      <i className="ti ti-flag" />
                    </span>
                  )}
                </div>
              </Link>
              <span className="pill" style={{ alignSelf: "flex-start" }}>
                {i.type === "graded" ? `${i.company || ""} ${i.grade ?? ""}` : "Raw"} ·{" "}
                {i.variant_key}
              </span>
              <div className="xn">{i.card?.name || i.card_id}</div>
              <div className="xs">
                Qty {i.quantity} · cost {fmtUSD(i.cost_usd)}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="vc">{fmtUSD(i.lineValue)}</span>
                <button
                  className="tool"
                  style={{ height: 24, padding: "0 6px" }}
                  onClick={() => remove(i.id)}
                  aria-label="Remove"
                >
                  <i className="ti ti-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .cl-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }
      `}</style>
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--t3)" }}>
        {label}
      </div>
      <div className={`mono ${tone || ""}`} style={{ fontSize: 22, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}
