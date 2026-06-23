import { APP_VERSION } from "@/lib/version";

// Phase 1 landing — confirms the design system renders (fonts, tokens, version
// footer). Browse/Search replaces this in Phase 2.
export default function Home() {
  return (
    <main className="wrap" style={{ maxWidth: 760, paddingTop: 64 }}>
      <p className="pill" style={{ marginBottom: 18 }}>
        <i className="ti ti-shield-lock" /> Clean rebuild · foundation
      </p>
      <h1 className="display" style={{ fontSize: 44, lineHeight: 1.05 }}>
        DNA Card <span style={{ color: "var(--br)" }}>Vault</span>
      </h1>
      <p style={{ color: "var(--t2)", fontSize: 17, marginTop: 14, maxWidth: 560 }}>
        The serious collector&apos;s command center for trading cards as assets — track what you own
        across every TCG, value it accurately, and get real investment intelligence.
      </p>

      <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
        <button className="btn">
          <i className="ti ti-search" /> Browse cards
        </button>
        <button className="tool">
          <i className="ti ti-cards" /> My collection
        </button>
      </div>

      <div className="card" style={{ marginTop: 36, padding: 18 }}>
        <h3 style={{ fontSize: 15, marginBottom: 10 }}>Foundation in place</h3>
        <p style={{ color: "var(--t2)", fontSize: 13.5, margin: 0 }}>
          Canonical Scrydex-id data layer, one pricing service, one money formatter, the four-entity
          schema (Card · Variant · Item · Portfolio), and plan-safe deploy guardrails. Next:
          Browse &amp; the Card page.
        </p>
      </div>

      <footer style={{ marginTop: 40, color: "var(--t3)", fontSize: 12 }} className="mono">
        v{APP_VERSION}
      </footer>
    </main>
  );
}
