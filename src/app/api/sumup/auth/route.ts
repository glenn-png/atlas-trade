import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.SUMUP_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!clientId) {
    return NextResponse.redirect(new URL("/settings?error=no_client_id", appUrl));
  }

  const redirectUri = `${appUrl}/api/sumup/callback`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "transactions.history user.profile_readonly",
  });

  return NextResponse.redirect(`https://api.sumup.com/authorize?${params}`);
}
