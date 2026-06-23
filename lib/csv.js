// ============================================================================
// lib/csv.js — parse a Collectr (or generic) CSV export into normalized rows.
// This is the ONLY place cross-source matching is allowed: a CSV has no Scrydex
// id, so it must be resolved once at import (see /api/import). Everything after
// keys off the canonical Scrydex id.
// ============================================================================

// Minimal RFC-4180-ish parser (handles quotes, commas, newlines in quotes).
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const s = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

function pick(obj, names) {
  for (const n of names) {
    const k = Object.keys(obj).find((key) => key.toLowerCase().trim() === n);
    if (k && obj[k] != null && String(obj[k]).trim() !== "") return String(obj[k]).trim();
  }
  return null;
}

// Map header+rows -> normalized import rows. Tolerant of Collectr column naming.
export function normalizeRows(matrix) {
  if (!matrix.length) return [];
  const header = matrix[0].map((h) => h.toLowerCase().trim());
  const out = [];
  for (let r = 1; r < matrix.length; r++) {
    const obj = {};
    header.forEach((h, i) => (obj[h] = matrix[r][i]));

    const name = pick(obj, ["name", "card name", "card", "product name", "title"]);
    if (!name) continue;

    const gradedRaw = pick(obj, ["graded", "is graded", "grade type"]);
    const grade = pick(obj, ["grade", "grade value", "card grade"]);
    const company = pick(obj, ["grading company", "grader", "company", "grade company"]);
    const isGraded =
      (gradedRaw && /yes|true|1/i.test(gradedRaw)) || (!!grade && !!company);

    out.push({
      name,
      number: pick(obj, ["number", "card number", "collector number", "no", "#"]),
      set: pick(obj, ["set", "set name", "expansion", "series"]),
      game: (pick(obj, ["game", "tcg", "category"]) || "pokemon").toLowerCase(),
      quantity: Number(pick(obj, ["quantity", "qty", "count"]) || 1),
      condition: pick(obj, ["condition", "card condition"]),
      type: isGraded ? "graded" : "raw",
      company: isGraded ? (company || "").toUpperCase() || null : null,
      grade: isGraded && grade ? Number(grade) : null,
      cert: pick(obj, ["cert", "cert number", "certification"]),
      cost_usd: numFrom(pick(obj, ["cost", "purchase price", "paid", "buy price", "price paid"])),
      acquired_at: pick(obj, ["acquired", "purchase date", "date", "date added"]),
    });
  }
  return out;
}

function numFrom(v) {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isNaN(n) ? null : n;
}

// game guess -> Scrydex game id
export function gameToScrydex(game) {
  const g = (game || "").toLowerCase();
  if (g.includes("one") && g.includes("piece")) return "onepiece";
  if (g.includes("lorcana")) return "lorcana";
  if (g.includes("gundam")) return "gundam";
  if (g.includes("riftbound")) return "riftbound";
  return "pokemon";
}
