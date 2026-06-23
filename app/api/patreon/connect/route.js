import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Kicks off Patreon OAuth for the supporter tier.
export async function GET(request) {
  const { origin } = new URL(request.url);
  const clientId = process.env.PATREON_CLIENT_ID;
  const redirect = process.env.PATREON_REDIRECT_URI || `${origin}/api/patreon/callback`;
  if (!clientId) {
    return NextResponse.redirect(`${origin}/settings?patreon=unconfigured`);
  }
  const url = new URL("https://www.patreon.com/oauth2/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirect);
  url.searchParams.set("scope", "identity identity.memberships");
  return NextResponse.redirect(url.toString());
}
