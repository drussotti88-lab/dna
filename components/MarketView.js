"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CardImage from "@/components/CardImage";
import { fmtUSD } from "@/lib/format";

export default function MarketView({ listings, sellable, signedIn, myId }) {
  const router = useRouter();
  const [tab, setTab] = useState("browse"); // browse | sell

  return (
    <div className="wrap">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <h1 className="display" style={{ fontSize: 24 }}>
          Marketplace
        </h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button className={`chip${tab === "browse" ? " on" : ""}`} onClick={() => setTab("browse")}>
            Browse
          </button>
          <button className={`chip${tab === "sell" ? " on" : ""}`} onClick={() => setTab("sell")}>
            Sell
          </button>
        </div>
      </div>

      {tab === "browse" ? (
        listings.length === 0 ? (
          <p style={{ color: "var(--t3)" }}>No active listings yet. Be the first to list a card.</p>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
            {listings.map((l) => (
              <ListingTile key={l.id} listing={l} mine={l.seller_id === myId} signedIn={signedIn} onChange={() => router.refresh()} />
            ))}
          </div>
        )
      ) : (
        <SellPanel sellable={sellable} signedIn={signedIn} onChange={() => router.refresh()} />
      )}
    </div>
  );
}

function ListingTile({ listing, mine, signedIn, onChange }) {
  const [offerOpen, setOfferOpen] = useState(false);
  const [amount, setAmount] = useState(listing.price_usd);
  const [msg, setMsg] = useState(null);

  async function makeOffer() {
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: listing.id, amount_usd: Number(amount) }),
    });
    if (res.status === 401) {
      setMsg("Sign in to make an offer.");
      return;
    }
    const d = await res.json();
    setMsg(d.error ? d.error : "Offer sent!");
  }

  async function cancel() {
    await fetch(`/api/listings?id=${listing.id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div className="xc">
      <Link href={`/card/${encodeURIComponent(listing.card_id)}?game=${listing.card?.game || "pokemon"}`}>
        <div className="xi">
          <CardImage src={listing.card?.images?.small} alt={listing.card?.name} />
        </div>
      </Link>
      <span className="pill" style={{ alignSelf: "flex-start" }}>
        {listing.type === "graded" ? `${listing.company || ""} ${listing.grade ?? ""}` : "Raw"}
      </span>
      <div className="xn">{listing.card?.name || listing.card_id}</div>
      <div className="vc">{fmtUSD(listing.price_usd)}</div>
      {mine ? (
        <button className="tool" onClick={cancel}>
          <i className="ti ti-x" /> Cancel listing
        </button>
      ) : !offerOpen ? (
        <button className="tool" onClick={() => setOfferOpen(true)}>
          <i className="ti ti-coin" /> Make offer
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input className="fi" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <button className="btn" style={{ minHeight: 34 }} onClick={makeOffer}>
            Send offer
          </button>
        </div>
      )}
      {msg && <p className="xs" style={{ color: "var(--t2)" }}>{msg}</p>}
    </div>
  );
}

function SellPanel({ sellable, signedIn, onChange }) {
  if (!signedIn) {
    return (
      <div className="card" style={{ padding: 16, maxWidth: 420 }}>
        <p className="xs" style={{ marginBottom: 8 }}>Sign in to list cards from your collection.</p>
        <Link href="/login" className="btn">
          <i className="ti ti-login" /> Sign in
        </Link>
      </div>
    );
  }
  if (!sellable.length) {
    return <p style={{ color: "var(--t3)" }}>Add cards to your collection first, then list them here.</p>;
  }
  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
      {sellable.map((it) => (
        <SellTile key={it.id} item={it} onChange={onChange} />
      ))}
    </div>
  );
}

function SellTile({ item, onChange }) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(item.marketValue ? Math.round(item.marketValue) : "");
  const [done, setDone] = useState(false);

  async function list() {
    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: item.id,
        card_id: item.card_id,
        variant_key: item.variant_key,
        type: item.type,
        company: item.company,
        grade: item.grade,
        price_usd: Number(price),
      }),
    });
    if (res.ok) {
      setDone(true);
      setTimeout(onChange, 800);
    }
  }

  return (
    <div className="xc">
      <div className="xi">
        <CardImage src={item.card?.images?.small} alt={item.card?.name} />
      </div>
      <div className="xn">{item.card?.name || item.card_id}</div>
      <div className="xs">Market {fmtUSD(item.marketValue)}</div>
      {!open ? (
        <button className="tool" onClick={() => setOpen(true)}>
          <i className="ti ti-tag" /> List for sale
        </button>
      ) : done ? (
        <span className="pill ok">Listed ✓</span>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input className="fi" type="number" placeholder="Price USD" value={price} onChange={(e) => setPrice(e.target.value)} />
          <button className="btn" style={{ minHeight: 34 }} onClick={list}>
            List
          </button>
        </div>
      )}
    </div>
  );
}
