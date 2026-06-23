"use client";

import Link from "next/link";
import CardImage from "@/components/CardImage";
import { value, isSpecialFormat } from "@/lib/pricing";
import { fmtUSD } from "@/lib/format";

// Catalog/collection grid unit. Image on top, name, a variant chip BELOW the
// thumbnail, set·number, price in green mono. The card art is the hero — never
// covered by overlays.
export default function CardTile({ card, owned = false, onQuickAdd }) {
  // default = first non-special-format variant
  const variant =
    (card.variants || []).find((v) => !isSpecialFormat(v)) || card.variants?.[0] || null;
  const v = value(card, { variant: variant?.key });

  const href = `/card/${encodeURIComponent(card.id)}?game=${card.game || "pokemon"}`;

  return (
    <Link href={href} className={`xc${owned ? " owned" : ""}`}>
      <div className="xi">
        <CardImage src={card.images?.small} alt={card.name} />
        {owned && <span className="owned-check"><i className="ti ti-check" /></span>}
        {onQuickAdd && (
          <button
            className="quick-add"
            aria-label="Quick add"
            onClick={(e) => {
              e.preventDefault();
              onQuickAdd(card);
            }}
          >
            <i className="ti ti-plus" />
          </button>
        )}
      </div>

      {variant && (
        <span className="pill" style={{ alignSelf: "flex-start" }}>
          {variant.label}
        </span>
      )}
      <div className="xn">{card.name}</div>
      <div className="xs">
        {card.setName || card.setId || ""}
        {card.number ? ` · #${card.number}` : ""}
      </div>
      <div className="vc">{fmtUSD(v.amount)}</div>
    </Link>
  );
}
