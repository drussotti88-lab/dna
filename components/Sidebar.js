"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// Left sidebar nav: icon + tooltip, 58px collapsed / 200px open.
// Collapses to a slide-over on mobile.
const NAV = [
  { href: "/browse", icon: "ti-search", label: "Browse" },
  { href: "/collection", icon: "ti-cards", label: "Collection" },
  { href: "/picks", icon: "ti-trending-up", label: "Vault Picks" },
  { href: "/grading", icon: "ti-microscope", label: "Grading Lab" },
  { href: "/intel", icon: "ti-chart-candle", label: "Intel" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* mobile top bar */}
      <div className="topbar">
        <button className="tool" onClick={() => setOpen((o) => !o)} aria-label="Menu">
          <i className="ti ti-menu-2" />
        </button>
        <span className="display" style={{ fontSize: 16 }}>
          DNA <span style={{ color: "var(--br)" }}>Vault</span>
        </span>
      </div>

      <nav id="sb" className={open ? "open" : ""}>
        <Link href="/browse" className="sb-brand" onClick={() => setOpen(false)}>
          <span className="sb-mark">DNA</span>
          <span className="sb-word">Vault</span>
        </Link>
        <div className="sb-nav">
          {NAV.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`sb-item${active ? " active" : ""}`}
                onClick={() => setOpen(false)}
                data-tip={n.label}
              >
                <i className={`ti ${n.icon}`} />
                <span className="sb-label">{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <style jsx>{`
        .topbar {
          display: none;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-bottom: 1px solid var(--bo);
          background: var(--sf);
          position: sticky;
          top: 0;
          z-index: 30;
        }
        :global(#sb) {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px 9px;
          overflow: hidden;
          transition: width 0.15s ease;
        }
        :global(#sb:hover) {
          width: var(--sb-open);
        }
        .sb-brand {
          display: flex;
          align-items: baseline;
          gap: 6px;
          padding: 6px 8px 14px;
          font-family: var(--font-display), sans-serif;
          font-weight: 800;
          white-space: nowrap;
        }
        .sb-mark {
          color: var(--br);
          font-size: 18px;
        }
        .sb-word {
          font-size: 16px;
          opacity: 0;
          transition: opacity 0.15s;
        }
        :global(#sb:hover) .sb-word {
          opacity: 1;
        }
        .sb-nav {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .sb-item {
          display: flex;
          align-items: center;
          gap: 12px;
          height: 40px;
          padding: 0 10px;
          border-radius: var(--r-sm);
          color: var(--t2);
          white-space: nowrap;
          transition: background 0.12s, color 0.12s;
        }
        .sb-item i {
          font-size: 19px;
          flex-shrink: 0;
          width: 22px;
          text-align: center;
        }
        .sb-item:hover {
          background: var(--sf2);
          color: var(--t1);
        }
        .sb-item.active {
          background: color-mix(in srgb, var(--br) 18%, transparent);
          color: var(--brl);
        }
        .sb-label {
          font-size: 13.5px;
          opacity: 0;
          transition: opacity 0.15s;
        }
        :global(#sb:hover) .sb-label {
          opacity: 1;
        }
        @media (max-width: 720px) {
          .topbar {
            display: flex;
          }
          :global(#sb) {
            width: var(--sb-open);
          }
          .sb-word,
          .sb-label {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
