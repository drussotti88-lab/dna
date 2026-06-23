import { searchCards } from "@/lib/scrydex";
import { gameToScrydex } from "@/lib/csv";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";

// POST /api/scan { image: "data:image/jpeg;base64,...", game? }
// Uses Anthropic vision to identify the card (incl. Japanese, with translation),
// then resolves candidates from the Scrydex catalog.
export async function POST(request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "Scanner not configured (ANTHROPIC_API_KEY missing)." }, { status: 200 });
  }

  const body = await request.json();
  const dataUrl = body.image || "";
  const m = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/s);
  if (!m) return Response.json({ error: "Invalid image." }, { status: 400 });
  const mediaType = m[1];
  const b64 = m[2];

  const prompt = `Identify this trading card. Respond with ONLY a JSON object, no prose:
{"name": english card name, "name_original": name as printed (may be Japanese), "number": collector number or null, "set": set/expansion name or null, "language": "en" or "ja", "game": one of pokemon|onepiece|lorcana|gundam|riftbound, "confidence": 0..1}`;

  let identified = null;
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
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: b64 } },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "vision call failed");
    const text = (data.content || []).map((c) => c.text || "").join("");
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    identified = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 502 });
  }

  if (!identified?.name) {
    return Response.json({ identified, candidates: [] });
  }

  const game = gameToScrydex(identified.game || body.game || "pokemon");
  const query = [identified.name, identified.number].filter(Boolean).join(" ");
  let candidates = [];
  try {
    candidates = await searchCards(query, {
      game,
      lang: identified.language === "ja" ? "ja" : "en",
      pageSize: 24,
    });
  } catch {
    candidates = [];
  }

  return Response.json({ identified, game, candidates });
}
