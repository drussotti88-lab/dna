"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CardTile from "@/components/CardTile";

const GAMES = [
  { id: "pokemon", label: "Pokémon" },
  { id: "onepiece", label: "One Piece" },
  { id: "lorcana", label: "Lorcana" },
  { id: "gundam", label: "Gundam" },
  { id: "riftbound", label: "Riftbound" },
];

const SORTS = [
  { id: "relevance", label: "Relevance" },
  { id: "price-desc", label: "Price ↓" },
  { id: "price-asc", label: "Price ↑" },
  { id: "name", label: "Name" },
];

function priceOf(card) {
  const v = card.variants?.[0]?.prices?.find((p) => p.type === "raw");
  return v?.market ?? 0;
}

export default function BrowsePage() {
  const [game, setGame] = useState("pokemon");
  const [lang, setLang] = useState("en");
  const [q, setQ] = useState("");
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState(false);
  const [rarity, setRarity] = useState("all");
  const [sort, setSort] = useState("relevance");
  const debounce = useRef(null);

  // Forgiving search: debounce input, query the API.
  useEffect(() => {
    if (!q.trim()) {
      setCards([]);
      return;
    }
    setLoading(true);
    setTouched(true);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const url = `/api/search?q=${encodeURIComponent(q)}&game=${game}&lang=${lang}`;
        const res = await fetch(url);
        const data = await res.json();
        setError(data.error || null);
        setCards(data.cards || []);
      } catch (e) {
        setError(String(e.message || e));
        setCards([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(debounce.current);
  }, [q, game, lang]);

  const rarities = useMemo(() => {
    const set = new Set(cards.map((c) => c.rarity).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [cards]);

  const shown = useMemo(() => {
    let list = cards;
    if (rarity !== "all") list = list.filter((c) => c.rarity === rarity);
    if (sort === "price-desc") list = [...list].sort((a, b) => priceOf(b) - priceOf(a));
    else if (sort === "price-asc") list = [...list].sort((a, b) => priceOf(a) - priceOf(b));
    else if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [cards, rarity, sort]);

  return (
    <div className="wrap">
      <h1 className="display" style={{ fontSize: 24, marginBottom: 14 }}>
        Browse
      </h1>

      {/* game tabs + language toggle */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={`chip${game === g.id ? " on" : ""}`}
            onClick={() => setGame(g.id)}
          >
            {g.label}
          </button>
        ))}
        {game === "pokemon" && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button className={`chip${lang === "en" ? " on" : ""}`} onClick={() => setLang("en")}>
              EN
            </button>
            <button className={`chip${lang === "ja" ? " on" : ""}`} onClick={() => setLang("ja")}>
              日本語
            </button>
          </div>
        )}
      </div>

      {/* search bar */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <i
          className="ti ti-search"
          style={{ position: "absolute", left: 12, top: 12, color: "var(--t3)" }}
        />
        <input
          className="si"
          placeholder="Search a card name, artist, or number…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
      </div>

      {/* filter row */}
      {cards.length > 0 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <select className="pfs" value={rarity} onChange={(e) => setRarity(e.target.value)}>
            {rarities.map((r) => (
              <option key={r} value={r}>
                {r === "all" ? "All rarities" : r}
              </option>
            ))}
          </select>
          <select className="pfs" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <span className="pill" style={{ marginLeft: "auto" }}>
            {shown.length} results
          </span>
        </div>
      )}

      {/* states */}
      {error && (
        <div className="card" style={{ padding: 16, color: "var(--wn)", marginBottom: 16 }}>
          <i className="ti ti-alert-triangle" /> {error}
        </div>
      )}
      {loading && <p style={{ color: "var(--t3)" }}>Searching…</p>}
      {!loading && touched && !error && shown.length === 0 && (
        <p style={{ color: "var(--t3)" }}>No cards found. Try a different term.</p>
      )}
      {!touched && !error && (
        <p style={{ color: "var(--t3)" }}>
          Start typing to search the catalog across {GAMES.length} games.
        </p>
      )}

      <div className="grid">
        {shown.map((c) => (
          <CardTile key={c.id} card={c} />
        ))}
      </div>
    </div>
  );
}
