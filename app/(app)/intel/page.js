import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { fetchStoreCards } from "@/lib/cardstore";
import { topMovers, rawValue } from "@/lib/intel";
import CardImage from "@/components/CardImage";
import { fmtUSD, fmtPct } from "@/lib/format";
import MarketBrief from "@/components/MarketBrief";

export const dynamic = "force-dynamic";

export default async function IntelPage() {
  const supabase = await supabaseServer();
  const cards = await fetchStoreCards(supabase, { limit: 300 }).catch(() => []);
  const up = topMovers(cards, "up", 8);
  const down = topMovers(cards, "down", 8);

  const movers = [...up, ...down].map(({ card, m }) => ({
    name: card.name,
    set: card.setName,
    d30: m.d30,
    price: rawValue(card),
  }));

  return (
    <div className="wrap">
      <h1 className="display" style={{ fontSize: 24, marginBottom: 4 }}>
        Intel
      </h1>
      <p style={{ color: "var(--t2)", marginBottom: 16 }}>
        Market momentum across the vault. Market data, not financial advice.
      </p>

      <MarketBrief movers={movers} />

      <div className="cv-grid2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <MoverList title="Heating up" dir="up" rows={up} />
        <MoverList title="Cooling off" dir="down" rows={down} />
      </div>
    </div>
  );
}

function MoverList({ title, dir, rows }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <h3 style={{ fontSize: 14, marginBottom: 10 }}>
        <i className={`ti ti-trending-${dir === "up" ? "up" : "down"}`} /> {title}
      </h3>
      {rows.length === 0 ? (
        <p className="xs">No momentum data yet.</p>
      ) : (
        rows.map(({ card, m }) => (
          <Link
            key={card.id}
            href={`/card/${encodeURIComponent(card.id)}?game=${card.game || "pokemon"}`}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--bo)" }}
          >
            <div className="xi" style={{ width: 34, height: 46, flexShrink: 0 }}>
              <CardImage src={card.images?.small} alt={card.name} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="xn" style={{ fontSize: 12.5 }}>{card.name}</div>
              <div className="xs">{card.setName || ""}</div>
            </div>
            <span className={`mono ${m.d30 >= 0 ? "up" : "down"}`}>{fmtPct(m.d30)}</span>
          </Link>
        ))
      )}
    </div>
  );
}
