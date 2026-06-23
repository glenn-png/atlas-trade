import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL(`/settings?error=${error ?? "no_code"}`, appUrl));
  }

  const clientId = process.env.SUMUP_CLIENT_ID!;
  const clientSecret = process.env.SUMUP_CLIENT_SECRET!;
  const redirectUri = `${appUrl}/api/sumup/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch("https://api.sumup.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/settings?error=token_exchange_failed", appUrl));
  }

  const tokens = await tokenRes.json() as { access_token: string; refresh_token: string };

  // Fetch merchant profile to get merchant_code
  const profileRes = await fetch("https://api.sumup.com/v0.1/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileRes.ok) {
    return NextResponse.redirect(new URL("/settings?error=profile_fetch_failed", appUrl));
  }

  const profile = await profileRes.json() as { merchant_profile?: { merchant_code?: string } };
  const merchantCode = profile.merchant_profile?.merchant_code ?? "";

  await prisma.sumupCredential.upsert({
    where: { id: "default" },
    update: { merchantCode, refreshToken: tokens.refresh_token, connectedAt: new Date() },
    create: { id: "default", merchantCode, refreshToken: tokens.refresh_token },
  });

  return NextResponse.redirect(new URL("/settings?connected=1", appUrl));
}
