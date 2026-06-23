import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { valueItems } from "@/lib/collection";
import { ensureDefaultPortfolio } from "@/lib/portfolio";
import CollectionView from "@/components/CollectionView";

export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="wrap">
        <h1 className="display" style={{ fontSize: 24, marginBottom: 8 }}>
          Collection
        </h1>
        <div className="card" style={{ padding: 18, maxWidth: 420 }}>
          <p style={{ color: "var(--t2)", marginBottom: 12 }}>
            Sign in to see your portfolios, value, and profit/loss.
          </p>
          <Link href="/login" className="btn">
            <i className="ti ti-login" /> Sign in
          </Link>
        </div>
      </div>
    );
  }

  await ensureDefaultPortfolio(supabase, user.id);
  const { data: portfolios } = await supabase
    .from("portfolios")
    .select("*")
    .order("created_at", { ascending: true });
  const { data: rawItems } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  const { items, totals } = await valueItems(supabase, rawItems || []);

  return <CollectionView items={items} totals={totals} portfolios={portfolios || []} />;
}
