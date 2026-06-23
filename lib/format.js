// ============================================================================
// lib/format.js — the ONE money formatter. Money goes through here, full stop.
// USD, 2 decimals + thousands separators. Never raw toFixed anywhere.
// ============================================================================

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Format a USD amount. null/undefined/NaN -> em dash.
export function fmtUSD(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return "—";
  return USD.format(Number(amount));
}

// Percent change with sign (for momentum/trends). e.g. +12.4%
export function fmtPct(pct) {
  if (pct == null || Number.isNaN(Number(pct))) return "—";
  const n = Number(pct);
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

// Plain integer with separators (quantities, pops).
export function fmtNum(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("en-US").format(Number(n));
}
