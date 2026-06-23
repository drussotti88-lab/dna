export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";

// POST /api/intel/brief { movers: [{name,set,d30,price}] }
// Returns a short, plain market brief. No key -> 200 with no brief (UI falls back).
export async function POST(request) {
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ brief: null });

  const { movers } = await request.json();
  if (!movers?.length) return Response.json({ brief: null });

  const lines = movers
    .slice(0, 16)
    .map((m) => `${m.name} (${m.set || "?"}): ${m.d30?.toFixed(1)}% 30d, ~$${m.price?.toFixed(0)}`)
    .join("\n");

  const prompt = `You are a trading-card market analyst. Write a 2-3 sentence market brief for a serious collector based on this 30-day momentum data. Be specific and confident but factual; this is market data, not financial advice, so do not tell anyone to buy or sell. Plain, collector-native tone.\n\n${lines}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 220,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    if (!res.ok) return Response.json({ brief: null });
    const brief = (data.content || []).map((c) => c.text || "").join("").trim();
    return Response.json({ brief: brief || null });
  } catch {
    return Response.json({ brief: null });
  }
}
