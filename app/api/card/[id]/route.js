import { getCard, getListings } from "@/lib/scrydex";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/card/:id?game=pokemon&lang=en&comps=1
export async function GET(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const game = searchParams.get("game") || "pokemon";
  const lang = id.includes("_ja") ? "ja" : searchParams.get("lang") || "en";
  const wantComps = searchParams.get("comps") === "1";

  if (!process.env.SCRYDEX_API_KEY) {
    return Response.json({ card: null, error: "Scrydex API key not configured." }, { status: 200 });
  }

  try {
    const card = await getCard(id, { game, lang });
    let comps = [];
    if (wantComps) {
      comps = await getListings(id, { game, lang }).catch(() => []);
    }
    return Response.json({ card, comps });
  } catch (err) {
    return Response.json({ card: null, error: String(err.message || err) }, { status: 502 });
  }
}
