import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch("https://api.sumup.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error("Failed to refresh SumUp token");
  const data = await res.json() as { access_token: string; refresh_token?: string };
  return data.access_token;
}

function dayKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

export async function POST(req: NextRequest) {
  const cred = await prisma.sumupCredential.findFirst();
  if (!cred) {
    return NextResponse.json({ error: "SumUp not connected" }, { status: 400 });
  }

  const clientId = process.env.SUMUP_CLIENT_ID!;
  const clientSecret = process.env.SUMUP_CLIENT_SECRET!;

  let accessToken: string;
  try {
    accessToken = await getAccessToken(cred.refreshToken, clientId, clientSecret);
  } catch {
    return NextResponse.json({ error: "Token refresh failed — reconnect SumUp in Settings" }, { status: 401 });
  }

  // Sync last 90 days, skipping already-synced past days
  const now = new Date();
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - 90);
  const todayKey = dayKey(now);

  const existingSyncDays = await prisma.salesDay.findMany({
    where: { source: "SUMUP", date: { gte: fromDate } },
    select: { date: true },
  });
  const alreadySynced = new Set(existingSyncDays.map((d) => dayKey(new Date(d.date))));

  // Fetch transactions
  const params = new URLSearchParams({
    oldest_time: fromDate.toISOString(),
    newest_time: now.toISOString(),
    "statuses[]": "SUCCESSFUL",
    limit: "100",
  });

  const txnRes = await fetch(
    `https://api.sumup.com/v2.1/merchants/${cred.merchantCode}/transactions/history?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!txnRes.ok) {
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 502 });
  }

  const txnData = await txnRes.json() as { items?: Array<{ transaction_code: string; timestamp: string }> };
  const transactions = txnData.items ?? [];

  // For each transaction not in an already-synced past day, fetch receipt
  const dailyTotals: Record<string, number> = {};

  for (const txn of transactions) {
    const txnDay = txn.timestamp.split("T")[0];
    if (txnDay !== todayKey && alreadySynced.has(txnDay)) continue;

    const receiptRes = await fetch(
      `https://api.sumup.com/v0.1/receipts/${txn.transaction_code}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!receiptRes.ok) continue;

    const receipt = await receiptRes.json() as {
      products?: Array<{ name?: string; total_price?: number; quantity?: number; price?: number }>;
    };

    const msItems = (receipt.products ?? []).filter((p) =>
      p.name?.toLowerCase().includes("ms -") || p.name?.toLowerCase().includes("ms-")
    );

    if (msItems.length === 0) continue;

    const dayTotal = msItems.reduce((sum, p) => {
      return sum + (p.total_price ?? (p.price ?? 0) * (p.quantity ?? 1));
    }, 0);

    dailyTotals[txnDay] = (dailyTotals[txnDay] ?? 0) + dayTotal;
  }

  // Upsert SalesDay records
  let upserted = 0;
  for (const [dateStr, total] of Object.entries(dailyTotals)) {
    const date = new Date(dateStr);
    date.setUTCHours(0, 0, 0, 0);
    await prisma.salesDay.upsert({
      where: { date },
      update: { msSinglesTotal: total, source: "SUMUP", syncedAt: new Date() },
      create: {
        id: crypto.randomUUID(),
        date,
        msSinglesTotal: total,
        transactionCount: 0,
        source: "SUMUP",
      },
    });
    upserted++;
  }

  return NextResponse.json({ synced: upserted, days: Object.keys(dailyTotals) });
}
