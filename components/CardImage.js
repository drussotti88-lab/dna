"use client";

import { useState } from "react";

// Never block a list render on images; never show a broken image.
// Falls back to a calm placeholder. (One image path: src is our CDN url at
// ingestion; live Scrydex url only as a transient fallback in early phases.)
export default function CardImage({ src, alt }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="ph">
        <i className="ti ti-cards" />
        <style jsx>{`
          .ph {
            width: 100%;
            height: 100%;
            display: grid;
            place-items: center;
            color: var(--t3);
            font-size: 28px;
            background: var(--sf3);
          }
        `}</style>
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt || ""} loading="lazy" onError={() => setFailed(true)} />;
}
