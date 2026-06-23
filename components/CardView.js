"use client";

import { useMemo, useState } from "react";
import CardImage from "@/components/CardImage";
import { value, isSpecialFormat, GRADE_MULTIPLIER } from "@/lib/pricing";
import { fmtUSD, fmtPct, fmtNum } from "@/lib/format";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import AddCopy from "@/components/AddCopy";

export default function CardView({ card, comps = [] }) {
  const variants = card.variants || [];
  const standard = variants.filter((v) => !isSpecialFormat(v));
  const special = variants.filter((v) => isSpecialFormat(v));

  const [variantKey, setVariantKey] = useState(
    (standard[0] || variants[0])?.key || null
  );
  const [graded, setGraded] = useState(false);

  const variant = variants.find((v) => v.key === variantKey) || variants[0] || null;

  // graders + grades available on this variant's graded prices
  const gradedPrices = (variant?.prices || []).filter((p) => p.type === "graded");
  const companies = Array.from(new Set(gradedPrices.map((p) => p.company).filter(Boolean)));
  const [company, setCompany] = useState(companies[0] || "PSA");
  const gradesForCompany = Array.from(
    new Set(
      gradedPrices
        .filter((p) => (p.company || "").toUpperCase() === (company || "").toUpperCase())
        .map((p) => p.grade)
    )
  ).sort((a, b) => b - a);
  const [grade, setGrade] = useState(gradesForCompany[0] || 10);

  const v = value(card, { variant: variantKey, graded, company, grade });

  // momentum pills from the chosen price entry's trends
  const trends = v.trends || null;

  // sold comps for the chart (filter to mode where possible)
  const chartComps = useMemo(() => {
    let rows = comps.filter((c) => c.priceUsd != null && c.soldAt);
    if (graded) {
      const m = rows.filter(
        (c) =>
          (c.company || "").toUpperCase() === (company || "").toUpperCase() &&
          Number(c.grade) === Number(grade)
      );
      if (m.length) rows = m;
    } else {
      const raw = rows.filter((c) => !c.grade);
      if (raw.length) rows = raw;
    }
    return [...rows].sort((a, b) => new Date(a.soldAt) - new Date(b.soldAt));
  }, [comps, graded, company, grade]);

  const rawMarket =
    (variant?.prices || []).find((p) => p.type === "raw")?.market ?? null;

  return (
    <>
      {/* hero + info: two-column responsive grid */}
      <div className="cv-top">
        <div className="cv-hero card">
          <CardImage src={card.images?.large || card.images?.small} alt={card.name} />
        </div>

        <div className="cv-info">
          <h1 className="display" style={{ fontSize: 26, lineHeight: 1.1 }}>
            {card.name}
          </h1>
          <p style={{ color: "var(--t2)", margin: "6px 0 2px" }}>
            {card.setName || card.setId}
            {card.number ? ` · #${card.number}` : ""}
            {card.rarity ? ` · ${card.rarity}` : ""}
          </p>
          {card.artist && (
            <p className="xs" style={{ marginBottom: 8 }}>
              Illus. {card.artist}
            </p>
          )}

          {/* variant selector */}
          <div className="cv-section-label">Printing</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {standard.map((vr) => (
              <button
                key={vr.key}
                className={`chip${variantKey === vr.key ? " on" : ""}`}
                onClick={() => setVariantKey(vr.key)}
              >
                {vr.label}
              </button>
            ))}
          </div>
          {special.length > 0 && (
            <>
              <div className="cv-section-label" style={{ marginTop: 10 }}>
                Other formats
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {special.map((vr) => (
                  <button
                    key={vr.key}
                    className={`chip${variantKey === vr.key ? " on" : ""}`}
                    onClick={() => setVariantKey(vr.key)}
                  >
                    {vr.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* raw / graded toggle */}
          <div style={{ display: "flex", gap: 6, margin: "14px 0 10px" }}>
            <button className={`chip${!graded ? " on" : ""}`} onClick={() => setGraded(false)}>
              Raw
            </button>
            <button className={`chip${graded ? " on" : ""}`} onClick={() => setGraded(true)}>
              Graded
            </button>
          </div>

          {graded && (
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <select
                className="pfs"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              >
                {(companies.length ? companies : ["PSA", "CGC", "BGS", "TAG"]).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                className="pfs"
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
              >
                {(gradesForCompany.length ? gradesForCompany : [10, 9.5, 9, 8]).map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* headline value panel */}
          <div className="cv-value">
            <div className="cv-value-label">Market value</div>
            <div className="cv-value-amt mono">{fmtUSD(v.amount)}</div>
            <div className="cv-value-meta">
              <span className={`pill ${v.source === "estimate" ? "" : "ok"}`}>
                <i className="ti ti-database" /> {v.source}
              </span>
              {trends?.days_7 && (
                <span className={`pill ${trends.days_7.percent_change >= 0 ? "ok" : "no"}`}>
                  7d {fmtPct(trends.days_7.percent_change)}
                </span>
              )}
              {trends?.days_30 && (
                <span className={`pill ${trends.days_30.percent_change >= 0 ? "ok" : "no"}`}>
                  30d {fmtPct(trends.days_30.percent_change)}
                </span>
              )}
            </div>
            {v.note && (
              <p className="xs" style={{ marginTop: 8, color: "var(--wn)" }}>
                <i className="ti ti-info-circle" /> {v.note}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* price history + sold comps */}
      <div className="cv-grid2">
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: 14, marginBottom: 10 }}>
            Price history{graded ? ` · ${company} ${grade}` : " · Raw"}
          </h3>
          <PriceHistoryChart comps={chartComps} />
        </div>

        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: 14, marginBottom: 10 }}>Recent sold comps</h3>
          {chartComps.length === 0 ? (
            <p className="xs">No sold comps available yet.</p>
          ) : (
            <div className="cv-comps">
              {[...chartComps]
                .reverse()
                .slice(0, 12)
                .map((c, i) => (
                  <div className="cv-comp-row" key={i}>
                    <span className="xs">
                      {new Date(c.soldAt).toLocaleDateString()}
                      {c.grade ? ` · ${c.company || ""} ${c.grade}` : " · Raw"}
                    </span>
                    <span className="mono" style={{ color: "var(--ok)" }}>
                      {fmtUSD(c.priceUsd)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* grade calculator */}
      <div className="card" style={{ padding: 16, marginTop: 16 }}>
        <h3 style={{ fontSize: 14, marginBottom: 4 }}>Grade calculator</h3>
        <p className="xs" style={{ marginBottom: 12 }}>
          Estimated value by grade vs the raw price {rawMarket != null ? `(${fmtUSD(rawMarket)})` : ""}.
        </p>
        <div className="cv-calc">
          {[10, 9.5, 9, 8].map((g) => {
            const gv = value(card, { variant: variantKey, graded: true, company, grade: g });
            const uplift =
              rawMarket && gv.amount ? gv.amount - rawMarket : null;
            return (
              <div className="cv-calc-cell" key={g}>
                <div className="xs">
                  {company} {g}
                </div>
                <div className="mono" style={{ fontSize: 16 }}>
                  {fmtUSD(gv.amount)}
                </div>
                {uplift != null && (
                  <div className={`mono xs ${uplift >= 0 ? "up" : "down"}`}>
                    {uplift >= 0 ? "+" : ""}
                    {fmtUSD(uplift)} vs raw
                  </div>
                )}
                <div className="xs" style={{ color: "var(--t3)" }}>
                  {gv.source === "estimate" ? "est." : gv.source}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Your Copies (ownership lands in Phase 3) */}
      <div className="card" style={{ padding: 16, marginTop: 16 }}>
        <h3 style={{ fontSize: 14, marginBottom: 6 }}>Your copies</h3>
        <p className="xs">
          Add this printing to a portfolio — set quantity, cost, and acquired date. Graded copies use
          the grader/grade selected above.
        </p>
        <AddCopy
          card={card}
          variantKey={variantKey}
          graded={graded}
          company={company}
          grade={grade}
        />
      </div>

      <style jsx>{`
        .cv-top {
          display: grid;
          grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
          gap: 24px;
          align-items: start;
        }
        .cv-hero {
          padding: 14px;
          aspect-ratio: 3 / 4;
          overflow: hidden;
        }
        .cv-hero :global(img) {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .cv-section-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--t3);
          margin-bottom: 6px;
        }
        .cv-value {
          margin-top: 16px;
          padding: 16px;
          border-radius: var(--r);
          background: color-mix(in srgb, var(--br) 14%, var(--sf));
          border: 1px solid color-mix(in srgb, var(--br) 35%, transparent);
        }
        .cv-value-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--t2);
        }
        .cv-value-amt {
          font-size: 34px;
          font-weight: 500;
          line-height: 1.1;
          margin: 2px 0 8px;
        }
        .cv-value-meta {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .cv-grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 16px;
        }
        .cv-comps {
          display: flex;
          flex-direction: column;
        }
        .cv-comp-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 7px 0;
          border-bottom: 1px solid var(--bo);
        }
        .cv-calc {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 12px;
        }
        .cv-calc-cell {
          padding: 12px;
          border: 1px solid var(--bo);
          border-radius: var(--r-sm);
          background: var(--sf2);
        }
        @media (max-width: 820px) {
          .cv-top {
            grid-template-columns: 1fr;
          }
          .cv-hero {
            max-width: 280px;
          }
          .cv-grid2 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
