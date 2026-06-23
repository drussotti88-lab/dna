import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { fetchStoreCards } from "@/lib/cardstore";
import { rankGradingFlips, momentum } from "@/lib/intel";
import CardImage from "@/components/CardImage";
import { fmtUSD, fmtPct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PicksPage() {
  const supabase = await supabaseServer();
  const cards = await fetchStoreCards(supabase, { limit: 300 }).catch(() => []);
  const ranked = rankGradingFlips(cards, { company: "PSA", minNet: 5 }).slice(0, 24);

  return (
    <div className="wrap">
      <h1 className="display" style={{ fontSize: 24, marginBottom: 4 }}>
        Vault Picks
      </h1>
      <p style={{ color: "var(--t2)", marginBottom: 4 }}>
        Grading-flip opportunities ranked by expected value after fees — market tooling, not
        financial advice.
      </p>
      <p className="xs" style={{ color: "var(--t3)", marginBottom: 18 }}>
        Built from the cards in your shared catalog store. The more cards in the vault, the sharper
        the picks.
      </p>

      {ranked.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
          {ranked.map(({ card, ev, mom }) => (
            <Link
              key={card.id}
              href={`/card/${encodeURIComponent(card.id)}?game=${card.game || "pokemon"}`}
              className="xc"
            >
              <div style={{ display: "flex", gap: 10 }}>
                <div className="xi" style={{ width: 70, flexShrink: 0 }}>
                  <CardImage src={card.images?.small} alt={card.name} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="xn">{card.name}</div>
                  <div className="xs">{card.setName || ""}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    <span className="pill ok">EV {fmtUSD(ev.net)}</span>
                    {mom.d30 != null && (
                      <span className={`pill ${mom.d30 >= 0 ? "ok" : "no"}`}>
                        30d {fmtPct(mom.d30)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="xs" style={{ marginTop: 8, color: "var(--t2)" }}>
                Raw {fmtUSD(ev.raw)} → PSA exp. {fmtUSD(ev.expectedGraded)} (−{fmtUSD(ev.fee)} fee).{" "}
                {ev.confidence < 0.5 ? "Partly estimated." : "Backed by graded prices."}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card" style={{ padding: 18, maxWidth: 520 }}>
      <p style={{ color: "var(--t2)", margin: 0 }}>
        No picks yet — the engine needs cards (with raw + graded prices) in the store. Add or import
        some cards, or open a few from{" "}
        <Link href="/browse" style={{ color: "var(--br)" }}>
          Browse
        </Link>
        , then check back. The daily refresh keeps prices and momentum current.
      </p>
    </div>
  );
}
