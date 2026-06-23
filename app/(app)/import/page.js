"use client";

import { useState } from "react";
import Link from "next/link";
import { parseCSV, normalizeRows } from "@/lib/csv";

const CHUNK = 40;

export default function ImportPage() {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState(null);
  const [results, setResults] = useState([]);
  const [needAuth, setNeedAuth] = useState(false);

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setSummary(null);
    setResults([]);
    const reader = new FileReader();
    reader.onload = () => {
      const matrix = parseCSV(reader.result);
      setRows(normalizeRows(matrix));
    };
    reader.readAsText(file);
  }

  async function runImport() {
    setBusy(true);
    setProgress(0);
    setNeedAuth(false);
    const agg = { added: 0, review: 0, unresolved: 0, errors: 0, processed: 0 };
    const allResults = [];
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: chunk }),
      });
      if (res.status === 401) {
        setNeedAuth(true);
        break;
      }
      const d = await res.json();
      if (d.summary) {
        for (const k of Object.keys(agg)) agg[k] += d.summary[k] || 0;
        allResults.push(...(d.results || []));
      }
      setProgress(Math.min(rows.length, i + CHUNK));
      setSummary({ ...agg });
      setResults([...allResults]);
    }
    setBusy(false);
  }

  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <h1 className="display" style={{ fontSize: 24, marginBottom: 6 }}>
        Import collection
      </h1>
      <p style={{ color: "var(--t2)", marginBottom: 18 }}>
        Upload a Collectr (or similar) CSV export. Each card is resolved to its canonical catalog
        entry and lands complete — anything we&apos;re unsure about is flagged for review, never
        silently mis-matched.
      </p>

      <div className="card" style={{ padding: 18 }}>
        <input type="file" accept=".csv,text/csv" onChange={onFile} />
        {fileName && (
          <p className="xs" style={{ marginTop: 10 }}>
            <strong>{fileName}</strong> — {rows.length} rows detected.
          </p>
        )}
        {rows.length > 0 && !busy && (
          <button className="btn" style={{ marginTop: 12 }} onClick={runImport}>
            <i className="ti ti-file-import" /> Import {rows.length} cards
          </button>
        )}
        {busy && (
          <p className="xs" style={{ marginTop: 12 }}>
            Importing… {progress}/{rows.length}
          </p>
        )}
      </div>

      {needAuth && (
        <div className="card" style={{ padding: 16, marginTop: 16 }}>
          <p className="xs" style={{ marginBottom: 8 }}>Sign in to import into your collection.</p>
          <Link href="/login" className="btn">
            <i className="ti ti-login" /> Sign in
          </Link>
        </div>
      )}

      {summary && (
        <div className="card" style={{ padding: 16, marginTop: 16 }}>
          <h3 style={{ fontSize: 14, marginBottom: 10 }}>Results</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <span className="pill ok">{summary.added} added</span>
            <span className="pill" style={{ color: "var(--wn)" }}>{summary.review} need review</span>
            <span className="pill no">{summary.unresolved} unresolved</span>
            {summary.errors > 0 && <span className="pill no">{summary.errors} errors</span>}
          </div>
          <Link href="/collection" className="tool">
            <i className="ti ti-cards" /> Go to collection
          </Link>
          <div style={{ marginTop: 12, maxHeight: 280, overflow: "auto" }}>
            {results.map((r, i) => (
              <div
                key={i}
                className="xs"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "5px 0",
                  borderBottom: "1px solid var(--bo)",
                }}
              >
                <span>{r.name}</span>
                <span style={{ color: statusColor(r.status) }}>
                  {r.matched ? `→ ${r.matched} ` : ""}
                  {r.confidence != null ? `(${r.confidence}%) ` : ""}
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function statusColor(s) {
  if (s === "added") return "var(--ok)";
  if (s === "review") return "var(--wn)";
  return "var(--no)";
}
