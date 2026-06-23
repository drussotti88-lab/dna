"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { fmtUSD } from "@/lib/format";

// Price-history line built from real sold comps (sold_at + price). Calm, on-brand.
export default function PriceHistoryChart({ comps = [] }) {
  if (!comps.length) {
    return (
      <div style={{ height: 220, display: "grid", placeItems: "center", color: "var(--t3)" }}>
        <span className="xs">Not enough sold data to chart yet.</span>
      </div>
    );
  }

  const data = comps.map((c) => ({
    t: new Date(c.soldAt).getTime(),
    price: c.priceUsd,
  }));

  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="var(--bo)" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            scale="time"
            tickFormatter={(t) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            tick={{ fill: "var(--t3)", fontSize: 10 }}
            stroke="var(--bo2)"
          />
          <YAxis
            tickFormatter={(v) => fmtUSD(v)}
            tick={{ fill: "var(--t3)", fontSize: 10 }}
            stroke="var(--bo2)"
            width={62}
          />
          <Tooltip
            contentStyle={{
              background: "var(--sf2)",
              border: "1px solid var(--bo2)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(t) => new Date(t).toLocaleDateString()}
            formatter={(val) => [fmtUSD(val), "Sold"]}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="var(--br)"
            strokeWidth={2}
            dot={{ r: 2, fill: "var(--br)" }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
