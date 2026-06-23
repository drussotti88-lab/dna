// Daily price refresh (plan-safe: once-daily cron, maxDuration <= 60).
// Stub for Phase 1 — the real refresh job (Scrydex -> price store, lazy fill,
// sold-comp sync) lands with the catalog store work.
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request) {
  // Protect cron from public hits.
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json({ ok: true, ran: "refresh-prices", version: APP_VERSION, note: "stub" });
}
