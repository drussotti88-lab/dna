import { APP_VERSION } from "@/lib/version";

// Plan-safe: trivial route, well under maxDuration. Used to detect stuck deploys
// (compare this to the built version in lib/version.js / the footer).
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ version: APP_VERSION, ok: true });
}
