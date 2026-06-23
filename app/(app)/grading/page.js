import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { fetchStoreCards } from "@/lib/cardstore";
import { rankGradingFlips } from "@/lib/intel";
import { fmtUSD } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function GradingPage() {
  const supabase = await supabaseServer();
  const cards = await fetchStoreCards(supabase, { limit: 300 }).catch(() => []);
  const ranked = rankGradingFlips(cards, { company: "PSA", minNet: 0 }).slice(0, 40);

  return (
    <div className="wrap">
      <h1 className="display" style={{ fontSize: 24, marginBottom: 4 }}>
        Grading Lab
      </h1>
      <p style={{ color: "var(--t2)", marginBottom: 18 }}>
        What&apos;s +EV to send in. Expected value weights likely grade outcomes against the raw you
        give up and the grading fee. Market tooling, not financial advice.
      </p>

      {ranked.length === 0 ? (
        <div className="card" style={{ padding: 18, maxWidth: 520 }}>
          <p style={{ color: "var(--t2)", margin: 0 }}>
            Nothing to rank yet. Add cards with raw and graded prices to the store, then return.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="gl-table">
            <thead>
              <tr>
                <th>Card</th>
                <th>Raw</th>
                <th>Exp. PSA</th>
                <th>Fee</th>
                <th>Net EV</th>
                <th>ROI</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(({ card, ev }) => (
                <tr key={card.id}>
                  <td>
                    <Link
                      href={`/card/${encodeURIComponent(card.id)}?game=${card.game || "pokemon"}`}
                      style={{ color: "var(--t1)" }}
                    >
                      {card.name}
                      <span className="xs" style={{ display: "block", color: "var(--t3)" }}>
                        {card.setName || ""}
                      </span>
                    </Link>
                  </td>
                  <td className="mono">{fmtUSD(ev.raw)}</td>
                  <td className="mono">{fmtUSD(ev.expectedGraded)}</td>
                  <td className="mono">{fmtUSD(ev.fee)}</td>
                  <td className={`mono ${ev.net >= 0 ? "up" : "down"}`}>
                    {ev.net >= 0 ? "+" : ""}
                    {fmtUSD(ev.net)}
                  </td>
                  <td className="mono">{ev.roi != null ? `${Math.round(ev.roi * 100)}%` : "—"}</td>
                  <td>
                    <span className={`pill ${ev.confidence >= 0.5 ? "ok" : ""}`}>
                      {ev.confidence >= 0.5 ? "real" : "est."}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .gl-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .gl-table th { text-align: left; padding: 10px 12px; color: var(--t3);
          font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em;
          border-bottom: 1px solid var(--bo); }
        .gl-table td { padding: 10px 12px; border-bottom: 1px solid var(--bo); }
        .gl-table tr:last-child td { border-bottom: none; }
      `}</style>
    </div>
  );
}
