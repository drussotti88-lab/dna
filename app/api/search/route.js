import { searchCards } from "@/lib/scrydex";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/search?q=charizard&game=pokemon&lang=en
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const game = searchParams.get("game") || "pokemon";
  const lang = searchParams.get("lang") || "en";

  if (!q.trim()) return Response.json({ cards: [] });

  if (!process.env.SCRYDEX_API_KEY) {
    return Response.json(
      { cards: [], error: "Scrydex API key not configured." },
      { status: 200 }
    );
  }

  try {
    const cards = await searchCards(q, { game, lang, pageSize: 60 });
    return Response.json({ cards });
  } catch (err) {
    return Response.json({ cards: [], error: String(err.message || err) }, { status: 502 });
  }
}
