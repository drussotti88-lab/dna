import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { valueItems } from "@/lib/collection";
import CardImage from "@/components/CardImage";
import { fmtUSD, fmtNum } from "@/lib/format";
import { isSupporter } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function PublicProfile({ params }) {
  const { handle } = await params;
  const supabase = await supabaseServer();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", handle)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="wrap">
        <p style={{ color: "var(--t3)" }}>No collector found at @{handle}.</p>
      </div>
    );
  }
  if (!profile.is_public) {
    return (
      <div className="wrap">
        <h1 className="display" style={{ fontSize: 24 }}>@{profile.handle}</h1>
        <p style={{ color: "var(--t3)" }}>This collector&apos;s vault is private.</p>
      </div>
    );
  }

  // public portfolio (admin read gated by is_public above)
  const admin = supabaseAdmin();
  const { data: rawItems } = await admin
    .from("items")
    .select("*")
    .eq("user_id", profile.id)
    .limit(120);
  const { items, totals } = await valueItems(supabase, rawItems || []);

  const { data: reviews } = await supabase
    .from("reviews")
    .select("*")
    .eq("subject_user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(10);
  const avg =
    reviews?.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <div className="wrap">
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
        <h1 className="display" style={{ fontSize: 26 }}>
          {profile.display_name || profile.handle}
        </h1>
        {isSupporter(profile) && <span className="pill" style={{ color: "var(--gold)" }}>Pro ✦</span>}
      </div>
      <p className="xs" style={{ color: "var(--t3)" }}>@{profile.handle}</p>
      {profile.bio && <p style={{ color: "var(--t2)", marginTop: 8, maxWidth: 560 }}>{profile.bio}</p>}

      <div style={{ display: "flex", gap: 16, margin: "18px 0" }}>
        <Stat label="Collection value" value={fmtUSD(totals.value)} />
        <Stat label="Copies" value={fmtNum(totals.count)} />
        {avg && <Stat label="Trust" value={`★ ${avg}`} />}
      </div>

      {items.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, margin: "8px 0 10px" }}>Showcase</h3>
          <div className="grid">
            {items.slice(0, 24).map((i) => (
              <div key={i.id} className="xc">
                <div className="xi">
                  <CardImage src={i.card?.images?.small} alt={i.card?.name} />
                </div>
                <div className="xn">{i.card?.name || i.card_id}</div>
                <div className="vc">{fmtUSD(i.marketValue)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card" style={{ padding: 14, minWidth: 140 }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--t3)" }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 20, marginTop: 4 }}>{value}</div>
    </div>
  );
}
