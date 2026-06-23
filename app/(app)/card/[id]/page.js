import Link from "next/link";
import { getCard, getListings } from "@/lib/scrydex";
import CardView from "@/components/CardView";

export const dynamic = "force-dynamic";

// Universal Card page (catalog view of one card + all printings).
// Server-fetches from Scrydex; CardView handles interactivity.
export default async function CardPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const game = sp?.game || "pokemon";
  const lang = id.includes("_ja") ? "ja" : sp?.lang || "en";

  if (!process.env.SCRYDEX_API_KEY) {
    return (
      <div className="wrap">
        <BackLink />
        <div className="card" style={{ padding: 18, color: "var(--wn)" }}>
          <i className="ti ti-alert-triangle" /> Scrydex API key not configured — add{" "}
          <code>SCRYDEX_API_KEY</code> to your environment to load card data.
        </div>
      </div>
    );
  }

  let card = null;
  let comps = [];
  let error = null;
  try {
    card = await getCard(id, { game, lang });
    comps = await getListings(id, { game, lang }).catch(() => []);
  } catch (err) {
    error = String(err.message || err);
  }

  if (error || !card) {
    return (
      <div className="wrap">
        <BackLink />
        <div className="card" style={{ padding: 18, color: "var(--no)" }}>
          <i className="ti ti-alert-triangle" /> Couldn&apos;t load this card. {error || ""}
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <BackLink />
      <CardView card={card} comps={comps} />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/browse" className="tool" style={{ marginBottom: 16 }}>
      <i className="ti ti-arrow-left" /> Back to browse
    </Link>
  );
}
